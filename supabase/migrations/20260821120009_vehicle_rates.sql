-- vehicle_rates: effective-dated pricing. Bookings snapshot the rate they
-- were quoted at acceptance time (see bookings.quote_snapshot) and never
-- recompute from whatever the *current* rate is (PRD §6.4).
create table public.vehicle_rates (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  rate_type public.rate_type not null,
  amount_laari integer not null check (amount_laari >= 0),
  effective_from timestamptz not null default now(),
  -- null = open-ended / current.
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from),
  -- A vehicle can't have two overlapping effective windows for the same
  -- rate_type — otherwise "the current daily rate" would be ambiguous.
  exclude using gist (
    vehicle_id with =,
    rate_type with =,
    tstzrange(effective_from, coalesce(effective_to, 'infinity'), '[)') with &&
  )
);

create index vehicle_rates_vehicle_id_idx on public.vehicle_rates (vehicle_id);

alter table public.vehicle_rates enable row level security;

create policy "vehicle_rates_select_org_member"
  on public.vehicle_rates for select
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_rates.vehicle_id and public.is_org_member(v.organization_id)
    )
  );

-- Customers pricing a listing need to read the current rate for an
-- available vehicle, same narrow shape as vehicles_select_available_for_discovery.
create policy "vehicle_rates_select_for_discovery"
  on public.vehicle_rates for select
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_rates.vehicle_id and v.status = 'available'
    )
  );

create policy "vehicle_rates_write_owner_manager"
  on public.vehicle_rates for insert
  to authenticated
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_rates.vehicle_id
        and public.has_org_role(v.organization_id, array['owner', 'manager']::public.org_role[])
    )
  );

create policy "vehicle_rates_update_owner_manager"
  on public.vehicle_rates for update
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_rates.vehicle_id
        and public.has_org_role(v.organization_id, array['owner', 'manager']::public.org_role[])
    )
  );

grant select, insert, update on public.vehicle_rates to authenticated;
