import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', userId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

interface UpdateMyProfileInput {
  userId: string;
  fullName?: string | null;
  phone?: string | null;
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMyProfileInput) => {
      const { data, error } = await getSupabase()
        .from('profiles')
        .update({ full_name: input.fullName, phone: input.phone })
        .eq('id', input.userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-profile', variables.userId] });
    },
  });
}
