-- booking_events: append-only audit timeline (PRD §8: "Append-only
-- state/audit timeline with actor and metadata"). No client ever writes
-- this table directly — every row is inserted by transition_booking_status()
-- (SECURITY DEFINER, see the overlap-protection migration), which is the
-- only place that both knows the actor and performs the corresponding
-- bookings UPDATE in the same transaction.
create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  event_type text not null,
  from_status public.booking_status,
  to_status public.booking_status,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index booking_events_booking_id_idx on public.booking_events (booking_id, created_at);

alter table public.booking_events enable row level security;

create policy "booking_events_select_participant"
  on public.booking_events for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_events.booking_id
        and (b.customer_id = auth.uid() or public.is_org_member(b.organization_id))
    )
    or public.is_platform_admin()
  );

-- SELECT only. Deliberately no INSERT/UPDATE/DELETE grant to authenticated
-- or anon at all: this table is written exclusively by SECURITY DEFINER
-- functions (owned by the table owner, which bypasses grants), never by a
-- direct client request. That is what "append-only" means here in
-- practice — the RLS policy above still decides *which* rows a reader
-- sees, this grant only makes the table reachable at all.
grant select on public.booking_events to authenticated;
