import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

export type Membership = Database['public']['Tables']['organization_members']['Row'] & {
  organizations: Database['public']['Tables']['organizations']['Row'];
};

/**
 * A user's first active organization membership. Onboarding only ever
 * creates one org per owner today, and there's no multi-org switcher yet
 * (Phase-0 ADR) — this is the seam to widen later, not a hard assumption
 * baked further in than this.
 */
export function useMyMembership(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-membership', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Membership | null> => {
      const { data, error } = await getSupabase()
        .from('organization_members')
        .select('*, organizations(*)')
        .eq('user_id', userId as string)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Membership | null;
    },
  });
}

interface CreateOrganizationInput {
  name: string;
  slug: string;
  defaultLocation?: string;
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrganizationInput) => {
      const { data, error } = await getSupabase()
        .from('organizations')
        .insert({ name: input.name, slug: input.slug, default_location: input.defaultLocation })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-membership'] });
    },
  });
}

export function useOrganizationMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('organization_members')
        .select('*, profiles(full_name, email, phone)')
        .eq('organization_id', organizationId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

interface InviteMemberInput {
  organizationId: string;
  email: string;
  role: Database['public']['Enums']['org_role'];
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      const { data, error } = await getSupabase().rpc('invite_org_member_by_email', {
        p_organization_id: input.organizationId,
        p_email: input.email,
        p_role: input.role,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', variables.organizationId] });
    },
  });
}
