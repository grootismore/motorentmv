-- Membership helper functions. Every RLS policy that needs to know "is the
-- current user part of this organization" goes through these — never a
-- client-supplied organization_id compared against anything the client
-- also controls. SECURITY DEFINER + a locked-down search_path so they
-- can't be tricked by a malicious search_path, and STABLE so the planner
-- can use them freely inside policies.

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_org_role(p_organization_id uuid, p_roles public.org_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any (p_roles)
  );
$$;

-- Financial data defaults to owner/manager only (PRD §6.6: "Owners see
-- all financial data; staff permissions must be explicit"). A future
-- per-member permissions column can widen this; nothing here narrows it
-- further for owner/manager.
create or replace function public.has_financial_access(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_org_role(p_organization_id, array['owner', 'manager']::public.org_role[]);
$$;
