import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import { compressImage, uploadWithRetry } from '../../lib/uploads';
import type { Database } from '../../lib/database.types';

export type VehiclePhoto = Database['public']['Tables']['documents']['Row'] & { signedUrl: string | null };

const VEHICLE_PHOTOS_BUCKET = 'vehicle-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * `documents` is the source of truth for "which photos exist" (it's what
 * every other authorization check in this schema keys off); signed URLs
 * are fetched fresh alongside it, never persisted (see
 * shouldPersistQuery in src/lib/query-persister.ts) since they expire.
 */
export function useVehiclePhotos(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-photos', vehicleId],
    enabled: Boolean(vehicleId),
    meta: { persist: false },
    queryFn: async (): Promise<VehiclePhoto[]> => {
      const supabase = getSupabase();
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('vehicle_id', vehicleId as string)
        .eq('document_type', 'vehicle_photo')
        .order('created_at', { ascending: true });
      if (error) throw error;

      if (docs.length === 0) return [];

      const { data: signed, error: signError } = await supabase.storage
        .from(VEHICLE_PHOTOS_BUCKET)
        .createSignedUrls(
          docs.map((d) => d.storage_path),
          SIGNED_URL_TTL_SECONDS,
        );
      if (signError) throw signError;

      return docs.map((doc, index) => ({ ...doc, signedUrl: signed[index]?.signedUrl ?? null }));
    },
  });
}

/**
 * One cover photo per vehicle, for a list of vehicles at once (the Fleet
 * list) -- a per-row useVehiclePhotos call for every item would be an
 * N+1 query pattern and can't be done in a loop anyway (hooks). Fetches
 * every vehicle_photo row across the given vehicles in one query, keeps
 * only the earliest per vehicle_id client-side (Postgres `distinct on`
 * isn't expressible through the JS client's query builder), then signs
 * that reduced set in one batched call. Returns a plain object keyed by
 * vehicle_id rather than a Map so it's a stable, JSON-friendly query
 * result React Query can compare between renders.
 */
export function useVehicleCoverPhotos(vehicleIds: string[]) {
  const key = [...vehicleIds].sort();
  return useQuery({
    queryKey: ['vehicle-cover-photos', key],
    enabled: vehicleIds.length > 0,
    meta: { persist: false },
    queryFn: async (): Promise<Record<string, string>> => {
      const supabase = getSupabase();
      const { data: docs, error } = await supabase
        .from('documents')
        .select('vehicle_id, storage_path, created_at')
        .in('vehicle_id', key)
        .eq('document_type', 'vehicle_photo')
        .order('created_at', { ascending: true });
      if (error) throw error;

      const coverByVehicle = new Map<string, string>();
      for (const doc of docs) {
        if (doc.vehicle_id && !coverByVehicle.has(doc.vehicle_id)) {
          coverByVehicle.set(doc.vehicle_id, doc.storage_path);
        }
      }
      if (coverByVehicle.size === 0) return {};

      const vehicleIdsInOrder = [...coverByVehicle.keys()];
      const { data: signed, error: signError } = await supabase.storage
        .from(VEHICLE_PHOTOS_BUCKET)
        .createSignedUrls(
          vehicleIdsInOrder.map((id) => coverByVehicle.get(id) as string),
          SIGNED_URL_TTL_SECONDS,
        );
      if (signError) throw signError;

      const result: Record<string, string> = {};
      vehicleIdsInOrder.forEach((vehicleId, index) => {
        const url = signed[index]?.signedUrl;
        if (url) result[vehicleId] = url;
      });
      return result;
    },
  });
}

interface UploadPhotoInput {
  vehicleId: string;
  organizationId: string;
  uri: string;
  width: number;
  height: number;
}

function randomFileName(contentType: string): string {
  const ext = contentType.split('/')[1] ?? 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

export function useUploadVehiclePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadPhotoInput) => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error('Not signed in');

      const compressed = await compressImage(input.uri, input.width, input.height);
      const path = `${input.vehicleId}/${randomFileName(compressed.contentType)}`;
      const response = await fetch(compressed.uri);
      const blob = await response.blob();

      await uploadWithRetry({
        bucket: VEHICLE_PHOTOS_BUCKET,
        path,
        blob,
        contentType: compressed.contentType,
      });

      const { data, error } = await supabase
        .from('documents')
        .insert({
          vehicle_id: input.vehicleId,
          organization_id: input.organizationId,
          document_type: 'vehicle_photo',
          storage_path: path,
          uploaded_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-photos', variables.vehicleId] });
      // Partial key match -- invalidates every useVehicleCoverPhotos query
      // regardless of which vehicle-id set it was fetched for, so the
      // Fleet list picks up a vehicle's first photo (or a new cover once
      // its current one is deleted below) without a manual pull-to-refresh.
      queryClient.invalidateQueries({ queryKey: ['vehicle-cover-photos'] });
    },
  });
}

export function useDeleteVehiclePhoto(vehicleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photo: VehiclePhoto) => {
      const supabase = getSupabase();
      const { error: removeError } = await supabase.storage
        .from(VEHICLE_PHOTOS_BUCKET)
        .remove([photo.storage_path]);
      if (removeError) throw removeError;
      const { error } = await supabase.from('documents').delete().eq('id', photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-photos', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-cover-photos'] });
    },
  });
}
