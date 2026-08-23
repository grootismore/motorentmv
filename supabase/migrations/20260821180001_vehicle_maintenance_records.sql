-- vehicle_maintenance_records: a structured service history per vehicle
-- (Prompt 8 "native-first fleet management" -- maintenance tracking).
--
-- `vehicles.status = 'maintenance'` already flags a vehicle as currently
-- out of service, but nothing until now records *what* was done, *when*,
-- or *at what odometer reading* -- the dashboard's finance/summary code
-- has an explicit doc comment noting there is no due-date/interval
-- concept in the schema. This table doesn't invent a predictive
-- "next service due" feature either (still no odometer-interval or
-- calendar-interval decision in the PRD) -- it only gives staff a real,
-- queryable log of completed maintenance, which is the honest scope of
-- what's being asked for today.
create table public.vehicle_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  description text not null,
  cost_laari integer check (cost_laari is null or cost_laari >= 0),
  odometer_km_at_service integer check (odometer_km_at_service is null or odometer_km_at_service >= 0),
  performed_on date not null,
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicle_maintenance_records_vehicle_id_idx
  on public.vehicle_maintenance_records (vehicle_id, performed_on desc);
create index vehicle_maintenance_records_organization_id_idx
  on public.vehicle_maintenance_records (organization_id);

create trigger set_vehicle_maintenance_records_updated_at
  before update on public.vehicle_maintenance_records
  for each row execute function public.set_updated_at();

alter table public.vehicle_maintenance_records enable row level security;

-- Mirrors vehicles' own access split exactly (PRD §4 access boundaries):
-- any org member can see the fleet board and its service history, but
-- only owner/manager record or correct it -- this is fleet operations
-- data, not the financial ledger (unlike expenses, which restrict reads
-- to owner/manager), so there's no has_financial_access() gate here.
create policy "vehicle_maintenance_records_select_org_member"
  on public.vehicle_maintenance_records for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "vehicle_maintenance_records_insert_owner_manager"
  on public.vehicle_maintenance_records for insert
  to authenticated
  with check (
    public.has_org_role(organization_id, array['owner', 'manager']::public.org_role[])
    and recorded_by = auth.uid()
  );

create policy "vehicle_maintenance_records_update_owner_manager"
  on public.vehicle_maintenance_records for update
  to authenticated
  using (public.has_org_role(organization_id, array['owner', 'manager']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner', 'manager']::public.org_role[]));

create policy "vehicle_maintenance_records_delete_owner_manager"
  on public.vehicle_maintenance_records for delete
  to authenticated
  using (public.has_org_role(organization_id, array['owner', 'manager']::public.org_role[]));

grant select, insert, update, delete on public.vehicle_maintenance_records to authenticated;
