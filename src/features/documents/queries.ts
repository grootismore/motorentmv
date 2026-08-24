import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import { compressImage, uploadWithRetry } from '../../lib/uploads';
import type { Database } from '../../lib/database.types';

export type MyDocument = Database['public']['Tables']['documents']['Row'] & { signedUrl: string | null };
export type MyDocumentType = Extract<Database['public']['Enums']['document_type'], 'license' | 'id_card'>;

const CUSTOMER_DOCUMENTS_BUCKET = 'customer-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * A customer's own profile-scoped documents (license/ID) -- see
 * 20260821210001_customer_documents_storage's own comment on why these
 * are private to the uploading customer and never org-visible. Signed
 * URLs are fetched fresh alongside the list, never persisted (same
 * `meta: { persist: false }` reasoning as useVehiclePhotos).
 */
export function useMyDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-documents', userId],
    enabled: Boolean(userId),
    meta: { persist: false },
    queryFn: async (): Promise<MyDocument[]> => {
      const supabase = getSupabase();
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('profile_id', userId as string)
        .in('document_type', ['license', 'id_card'])
        .order('created_at', { ascending: false });
      if (error) throw error;

      if (docs.length === 0) return [];

      const { data: signed, error: signError } = await supabase.storage
        .from(CUSTOMER_DOCUMENTS_BUCKET)
        .createSignedUrls(
          docs.map((d) => d.storage_path),
          SIGNED_URL_TTL_SECONDS,
        );
      if (signError) throw signError;

      return docs.map((doc, index) => ({ ...doc, signedUrl: signed[index]?.signedUrl ?? null }));
    },
  });
}

interface UploadMyDocumentInput {
  userId: string;
  documentType: MyDocumentType;
  uri: string;
  width: number;
  height: number;
}

function randomFileName(contentType: string): string {
  const ext = contentType.split('/')[1] ?? 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

export function useUploadMyDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadMyDocumentInput) => {
      const supabase = getSupabase();
      const compressed = await compressImage(input.uri, input.width, input.height);
      const path = `${input.userId}/${randomFileName(compressed.contentType)}`;
      const response = await fetch(compressed.uri);
      const blob = await response.blob();

      await uploadWithRetry({
        bucket: CUSTOMER_DOCUMENTS_BUCKET,
        path,
        blob,
        contentType: compressed.contentType,
      });

      const { data, error } = await supabase
        .from('documents')
        .insert({
          profile_id: input.userId,
          document_type: input.documentType,
          storage_path: path,
          uploaded_by: input.userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-documents', variables.userId] });
    },
  });
}

export function useDeleteMyDocument(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (document: MyDocument) => {
      const supabase = getSupabase();
      const { error: removeError } = await supabase.storage
        .from(CUSTOMER_DOCUMENTS_BUCKET)
        .remove([document.storage_path]);
      if (removeError) throw removeError;
      const { error } = await supabase.from('documents').delete().eq('id', document.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-documents', userId] });
    },
  });
}

/**
 * Mirrors public.customer_has_required_documents() (20260821220001) --
 * a customer needs a license and an ID/passport on file, neither
 * rejected, to submit a booking request. Kept in sync with the DB check
 * only for client-side UX (a clear inline message before ever calling
 * request_booking) -- the DB check is what actually enforces it.
 */
export function hasRequiredDocuments(documents: MyDocument[]): boolean {
  const hasType = (type: MyDocumentType) =>
    documents.some((d) => d.document_type === type && d.status !== 'rejected');
  return hasType('license') && hasType('id_card');
}

export const DOCUMENT_TYPE_LABEL: Record<MyDocumentType, string> = {
  license: "Driver's license",
  id_card: 'ID card',
};

export const DOCUMENT_STATUS_LABEL: Record<Database['public']['Enums']['document_status'], string> = {
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
};
