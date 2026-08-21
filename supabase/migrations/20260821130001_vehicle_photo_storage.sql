-- Private storage for vehicle photos (PRD §6.2/§10). Path convention is
-- `{vehicle_id}/{filename}` — authorization always re-derives
-- organization_id from the vehicles row via vehicle_id, never trusts a
-- path segment as the org id directly (same rule as every RLS policy
-- elsewhere in this schema).
--
-- storage.objects/storage.buckets already exist and already have RLS
-- enabled on a real Supabase project (owned by supabase_storage_admin,
-- not this migration role) — this only adds the bucket row and this
-- bucket's policies. On the local Postgres test harness, an equivalent
-- minimal stand-in for these tables is created by
-- supabase/local-dev/auth-shim.sql so these policies can be exercised
-- the same way the rest of the RLS suite is.
insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', false)
on conflict (id) do nothing;

create policy "vehicle_photos_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and exists (
      select 1 from public.vehicles v
      where v.id = (storage.foldername(name))[1]::uuid
        and (v.status = 'available' or public.is_org_member(v.organization_id))
    )
  );

create policy "vehicle_photos_insert_owner_manager"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-photos'
    and exists (
      select 1 from public.vehicles v
      where v.id = (storage.foldername(name))[1]::uuid
        and public.has_org_role(v.organization_id, array['owner', 'manager']::public.org_role[])
    )
  );

create policy "vehicle_photos_delete_owner_manager"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and exists (
      select 1 from public.vehicles v
      where v.id = (storage.foldername(name))[1]::uuid
        and public.has_org_role(v.organization_id, array['owner', 'manager']::public.org_role[])
    )
  );
