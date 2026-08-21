-- availability_blocks: manual/maintenance holds on a vehicle (PRD §6.2).
-- Self-overlap is enforced natively by the exclusion constraint below;
-- cross-checking against active bookings happens in the overlap-
-- protection migration once bookings exists (both directions need each
-- other's table).
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Half-open '[)' bounds, matching bookings: a block ending at 09:00 and
  -- one starting at 09:00 don't truly overlap and must both be allowed.
  exclude using gist (
    vehicle_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
);

create index availability_blocks_vehicle_id_idx on public.availability_blocks (vehicle_id);

alter table public.availability_blocks enable row level security;

create policy "availability_blocks_select_org_member"
  on public.availability_blocks for select
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = availability_blocks.vehicle_id and public.is_org_member(v.organization_id)
    )
  );

create policy "availability_blocks_write_owner_manager"
  on public.availability_blocks for insert
  to authenticated
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = availability_blocks.vehicle_id
        and public.has_org_role(v.organization_id, array['owner', 'manager']::public.org_role[])
    )
  );

create policy "availability_blocks_delete_owner_manager"
  on public.availability_blocks for delete
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = availability_blocks.vehicle_id
        and public.has_org_role(v.organization_id, array['owner', 'manager']::public.org_role[])
    )
  );

grant select, insert, delete on public.availability_blocks to authenticated;
