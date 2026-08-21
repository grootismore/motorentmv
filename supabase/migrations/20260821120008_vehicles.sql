-- vehicles: fleet inventory (PRD §6.2). Rental rates live in
-- vehicle_rates (effective-dated, so historical bookings can snapshot
-- them); `deposit_amount_laari` stays here since refundable deposits are
-- changed far less often and aren't retroactively recalculated the way
-- rates are.
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  internal_code text,
  registration_number text not null,
  make text,
  model text,
  year integer check (year is null or year between 1980 and 2100),
  -- Not a fixed enum: PRD doesn't confirm a category taxonomy (open
  -- decision), so this stays free text rather than inventing one.
  category text,
  transmission public.transmission_type,
  engine_size_cc integer check (engine_size_cc is null or engine_size_cc > 0),
  color text,
  status public.vehicle_status not null default 'draft',
  odometer_km integer not null default 0 check (odometer_km >= 0),
  deposit_amount_laari integer not null default 0 check (deposit_amount_laari >= 0),
  location text,
  included_accessories text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, registration_number)
);

create index vehicles_organization_id_idx on public.vehicles (organization_id);
create index vehicles_status_idx on public.vehicles (status);

create trigger set_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

alter table public.vehicles enable row level security;

-- Staff need to see and operate the fleet board, but only owner/manager
-- create/edit/retire vehicles (PRD §4 access boundaries).
create policy "vehicles_select_org_member"
  on public.vehicles for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "vehicles_insert_owner_manager"
  on public.vehicles for insert
  to authenticated
  with check (public.has_org_role(organization_id, array['owner', 'manager']::public.org_role[]));

create policy "vehicles_update_owner_manager"
  on public.vehicles for update
  to authenticated
  using (public.has_org_role(organization_id, array['owner', 'manager']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner', 'manager']::public.org_role[]));

-- Customers need to browse *available* vehicles across organizations to
-- search/discover — a deliberately narrow policy: only rows already
-- marked 'available', and only for anyone authenticated (not just
-- customers, but staff already have the broader org-member policy above,
-- and browsing available inventory isn't sensitive).
create policy "vehicles_select_available_for_discovery"
  on public.vehicles for select
  to authenticated
  using (status = 'available');

grant select, insert, update on public.vehicles to authenticated;
