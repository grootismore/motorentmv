import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import { compressImage, readFileForUpload, uploadWithRetry } from '../../lib/uploads';
import type { Database } from '../../lib/database.types';

export type Inspection = Database['public']['Tables']['inspections']['Row'];
export type InspectionType = Database['public']['Enums']['inspection_type'];

// Inspection photos live in the same `documents` metadata table as vehicle
// photos, tagged by document_type rather than a foreign key to inspections
// itself (schema predates this feature -- see 20260821120017), and their
// bytes live in the private `booking-documents` bucket (20260821160004),
// scoped to booking participants the same way vehicle-photos is scoped to
// org members/public availability.
const BOOKING_DOCUMENTS_BUCKET = 'booking-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function documentTypeFor(inspectionType: InspectionType): Database['public']['Enums']['document_type'] {
  return inspectionType === 'pickup' ? 'inspection_photo_before' : 'inspection_photo_after';
}

export function useInspections(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['inspections', bookingId],
    enabled: Boolean(bookingId),
    queryFn: async (): Promise<Inspection[]> => {
      const { data, error } = await getSupabase()
        .from('inspections')
        .select('*')
        .eq('booking_id', bookingId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export interface InspectionPhoto {
  id: string;
  signedUrl: string | null;
}

/** Same "documents is the source of truth, signed URLs fetched fresh, never
 * persisted" pattern as src/features/fleet/photos.ts -- a cached signed URL
 * would just be an expired one. */
export function useInspectionPhotos(bookingId: string | undefined, inspectionType: InspectionType) {
  return useQuery({
    queryKey: ['inspection-photos', bookingId, inspectionType],
    enabled: Boolean(bookingId),
    meta: { persist: false },
    queryFn: async (): Promise<InspectionPhoto[]> => {
      const supabase = getSupabase();
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('booking_id', bookingId as string)
        .eq('document_type', documentTypeFor(inspectionType))
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (docs.length === 0) return [];

      const { data: signed, error: signError } = await supabase.storage
        .from(BOOKING_DOCUMENTS_BUCKET)
        .createSignedUrls(
          docs.map((d) => d.storage_path),
          SIGNED_URL_TTL_SECONDS,
        );
      if (signError) throw signError;

      return docs.map((doc, index) => ({ id: doc.id, signedUrl: signed[index]?.signedUrl ?? null }));
    },
  });
}

export interface InspectionPhotoInput {
  uri: string;
  width: number;
  height: number;
}

export interface RecordInspectionInput {
  bookingId: string;
  organizationId: string;
  inspectionType: InspectionType;
  odometerKm: number | null;
  fuelBatteryPercent: number | null;
  conditionNotes: string;
  accessoriesChecklist: Record<string, boolean>;
  photos: InspectionPhotoInput[];
}

function randomFileName(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
}

/**
 * Reads the existing row (if any) before writing rather than a single
 * upsert call: the server deliberately narrows the UPDATE column grant to
 * just the checklist fields (20260821160001), excluding performed_by --
 * an upsert's generated ON CONFLICT DO UPDATE would try to reset
 * performed_by on every correction and fail with a permission error.
 * Explicit insert-or-update matches what the grants actually allow, and
 * doubles as the client-side "is this a first record or a correction"
 * signal the form UI needs anyway.
 */
export function useRecordInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordInspectionInput): Promise<Inspection> => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error('Not signed in');

      const { data: existing, error: existingError } = await supabase
        .from('inspections')
        .select('*')
        .eq('booking_id', input.bookingId)
        .eq('inspection_type', input.inspectionType)
        .maybeSingle();
      if (existingError) throw existingError;

      const checklistFields = {
        odometer_km: input.odometerKm,
        fuel_battery_percent: input.fuelBatteryPercent,
        condition_notes: input.conditionNotes.trim() || null,
        accessories_checklist: input.accessoriesChecklist,
      };

      let inspection: Inspection;
      if (existing) {
        const { data, error } = await supabase
          .from('inspections')
          .update(checklistFields)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        inspection = data;
      } else {
        const { data, error } = await supabase
          .from('inspections')
          .insert({
            booking_id: input.bookingId,
            inspection_type: input.inspectionType,
            performed_by: userId,
            ...checklistFields,
          })
          .select()
          .single();
        if (error) throw error;
        inspection = data;
      }

      const documentType = documentTypeFor(input.inspectionType);
      for (const photo of input.photos) {
        const compressed = await compressImage(photo.uri, photo.width, photo.height);
        const path = `${input.bookingId}/${randomFileName()}`;
        const blob = await readFileForUpload(compressed.uri);
        await uploadWithRetry({
          bucket: BOOKING_DOCUMENTS_BUCKET,
          path,
          blob,
          contentType: compressed.contentType,
        });
        const { error: docError } = await supabase.from('documents').insert({
          booking_id: input.bookingId,
          organization_id: input.organizationId,
          document_type: documentType,
          storage_path: path,
          uploaded_by: userId,
        });
        if (docError) throw docError;
      }

      return inspection;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspections', data.booking_id] });
      queryClient.invalidateQueries({
        queryKey: ['inspection-photos', data.booking_id, data.inspection_type],
      });
      queryClient.invalidateQueries({ queryKey: ['booking-events', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useAcknowledgeInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inspectionId: string): Promise<Inspection> => {
      const { data, error } = await getSupabase().rpc('acknowledge_inspection', {
        p_inspection_id: inspectionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspections', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['booking-events', data.booking_id] });
    },
  });
}
