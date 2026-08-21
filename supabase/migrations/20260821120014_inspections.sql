-- inspections: pickup/return checklists (PRD §6.5). Photos attach via
-- documents (booking_id + document_type in ('inspection_photo_before',
-- 'inspection_photo_after')), not a column here.
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  inspection_type public.inspection_type not null,
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  fuel_battery_percent integer check (fuel_battery_percent is null or fuel_battery_percent between 0 and 100),
  condition_notes text,
  accessories_checklist jsonb not null default '{}'::jsonb,
  performed_by uuid not null references public.profiles (id),
  acknowledged_by uuid references public.profiles (id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  -- One pickup and one return inspection per booking for the MVP; a redo
  -- is an edge case outside this scope (would need a soft-void/reopen
  -- flow, not modeled here).
  unique (booking_id, inspection_type)
);

create index inspections_booking_id_idx on public.inspections (booking_id);

alter table public.inspections enable row level security;

create policy "inspections_select_participant"
  on public.inspections for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = inspections.booking_id
        and (b.customer_id = auth.uid() or public.is_org_member(b.organization_id))
    )
  );

-- Only org staff run checklists — a customer can read their own
-- inspection record (for the receipt/condition review PRD §5 describes)
-- but never writes one.
create policy "inspections_write_org_member"
  on public.inspections for insert
  to authenticated
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = inspections.booking_id and public.is_org_member(b.organization_id)
    )
  );

create policy "inspections_update_org_member"
  on public.inspections for update
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = inspections.booking_id and public.is_org_member(b.organization_id)
    )
  );

grant select, insert, update on public.inspections to authenticated;
