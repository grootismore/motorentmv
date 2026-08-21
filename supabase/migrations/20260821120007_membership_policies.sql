-- RLS policies for organizations + organization_members, plus the
-- profiles visibility extension for "shares an org with me" — all
-- deferred until here because they depend on is_org_member/has_org_role.

-- organizations ----------------------------------------------------------

create policy "organizations_select_member_or_admin"
  on public.organizations for select
  to authenticated
  using (public.is_org_member(id) or public.is_platform_admin());

-- Any authenticated user may create an organization (self-serve signup);
-- the AFTER INSERT trigger below makes them its owner atomically.
create policy "organizations_insert_any_authenticated"
  on public.organizations for insert
  to authenticated
  with check (true);

create policy "organizations_update_owner"
  on public.organizations for update
  to authenticated
  using (public.has_org_role(id, array['owner']::public.org_role[]))
  with check (public.has_org_role(id, array['owner']::public.org_role[]));

-- Creating an organization has no membership to authorize itself against
-- yet (bootstrapping problem) — this SECURITY DEFINER trigger, owned by
-- the migration role, bypasses organization_members' RLS (table owners
-- are exempt from their own table's RLS unless FORCE ROW LEVEL SECURITY
-- is set) to insert the creator as owner in the same transaction as the
-- INSERT into organizations.
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.organization_members (organization_id, user_id, role, status)
  values (new.id, auth.uid(), 'owner', 'active');
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- organization_members -----------------------------------------------------

create policy "organization_members_select"
  on public.organization_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_org_member(organization_id)
    or public.is_platform_admin()
  );

-- Owners/managers can invite staff; only an owner can grant owner/manager.
-- This is enforced identically on INSERT and UPDATE so a manager can't
-- promote a staff member to owner by editing an existing row either.
create policy "organization_members_insert"
  on public.organization_members for insert
  to authenticated
  with check (
    (role = 'staff' and public.has_org_role(organization_id, array['owner', 'manager']::public.org_role[]))
    or (role in ('manager', 'owner') and public.has_org_role(organization_id, array['owner']::public.org_role[]))
  );

create policy "organization_members_update"
  on public.organization_members for update
  to authenticated
  using (public.has_org_role(organization_id, array['owner', 'manager']::public.org_role[]))
  with check (
    (role = 'staff' and public.has_org_role(organization_id, array['owner', 'manager']::public.org_role[]))
    or (role in ('manager', 'owner') and public.has_org_role(organization_id, array['owner']::public.org_role[]))
  );

-- profiles: extend visibility to "shares an active org membership with me"
-- (staff directory, seeing who invited whom, etc). Combines with the
-- self/admin policy from the profiles migration via OR (Postgres RLS
-- policies for the same command are permissive-by-default and OR'd).
create policy "profiles_select_org_colleague"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members mine
      join public.organization_members theirs
        on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = profiles.id
        and theirs.status = 'active'
    )
  );
