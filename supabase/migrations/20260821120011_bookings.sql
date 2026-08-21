-- bookings: the center of the domain (PRD §6.3/§6.4/§8). All timestamps
-- UTC; money as integer laari; quote_snapshot/policy_snapshot are frozen
-- once set (enforced by trigger in the overlap-protection migration,
-- which also owns the state-machine + overlap guard trigger — that
-- trigger references availability_blocks, so it's defined after both
-- tables exist).
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  vehicle_id uuid not null references public.vehicles (id),
  customer_id uuid not null references public.profiles (id),
  status public.booking_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Frozen at acceptance time (PRD §6.4). Shape is a documented
  -- application-level contract, not a fixed relational schema, since it's
  -- a point-in-time quote, not live data: rate_type, rate_amount_laari,
  -- units, subtotal_laari, discount_laari, delivery_fee_laari,
  -- deposit_amount_laari, total_laari.
  quote_snapshot jsonb,
  -- Cancellation/late-fee/deposit terms in effect when accepted.
  policy_snapshot jsonb,
  currency text not null default 'MVR',
  -- Denormalized from quote_snapshot for cheap reporting/dashboard
  -- queries without parsing jsonb (PRD §6.6 dashboard/reports).
  total_amount_laari integer check (total_amount_laari is null or total_amount_laari >= 0),
  payment_status public.payment_status not null default 'unpaid',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- The core overlap guarantee: no two bookings for the same vehicle may
  -- have overlapping ranges while either is accepted/ready/active. This
  -- is atomic and concurrency-safe at the index level — no advisory lock
  -- needed for this same-table case (unlike the cross-table check against
  -- availability_blocks, which does need one; see the overlap-protection
  -- migration).
  exclude using gist (
    vehicle_id with =,
    tstzrange(starts_at, ends_at, '[]') with &&
  ) where (status in ('accepted', 'ready', 'active'))
);

create index bookings_organization_id_idx on public.bookings (organization_id);
create index bookings_vehicle_id_idx on public.bookings (vehicle_id);
create index bookings_customer_id_idx on public.bookings (customer_id);
create index bookings_status_idx on public.bookings (status);

create trigger set_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;

create policy "bookings_select_participant"
  on public.bookings for select
  to authenticated
  using (
    customer_id = auth.uid()
    or public.is_org_member(organization_id)
    or public.is_platform_admin()
  );

-- A customer can request a booking directly; an org member can also
-- create one on the customer's behalf (walk-ins). Either way the row
-- always starts at draft/requested — the state-machine trigger (added in
-- the overlap-protection migration) enforces that regardless of which
-- policy let the INSERT through.
create policy "bookings_insert_customer_or_org_member"
  on public.bookings for insert
  to authenticated
  with check (customer_id = auth.uid() or public.is_org_member(organization_id));

-- Row-level: either party may touch a booking they're part of. What they
-- may actually change is narrowed by column grants below — status,
-- snapshots, totals and payment_status are never client-writable; all
-- state transitions go through transition_booking_status() (SECURITY
-- DEFINER, bypasses these grants, does its own authorization check).
create policy "bookings_update_participant"
  on public.bookings for update
  to authenticated
  using (customer_id = auth.uid() or public.is_org_member(organization_id))
  with check (customer_id = auth.uid() or public.is_org_member(organization_id));

grant select on public.bookings to authenticated;
-- Column-restricted, not a blanket INSERT: quote_snapshot, policy_snapshot,
-- total_amount_laari and payment_status must stay off this list. A blanket
-- grant would let a client smuggle in e.g. a pre-set quote_snapshot at
-- creation time on a 'requested' row (the "must be accepted/ready/active"
-- check in the overlap-protection trigger only guards those three
-- statuses) — which the immutability trigger would then lock in forever,
-- since it only knows "was this already set", not "was it set
-- legitimately". Omitted columns simply take their column default (null /
-- 'unpaid'), so normal booking creation is unaffected.
grant insert (organization_id, vehicle_id, customer_id, status, starts_at, ends_at, notes, currency)
  on public.bookings to authenticated;
grant update (starts_at, ends_at, notes) on public.bookings to authenticated;

-- Customers browsing availability need to know which (vehicle, range)
-- combinations are already taken, without seeing other customers' booking
-- details (PRD §6.4: "Show conflict explanations without leaking another
-- customer's data" — written for the booking engine in Prompt 4, but the
-- narrow view belongs here with the table). Exposes only what's needed to
-- compute "is this vehicle free for these dates", nothing else.
--
-- Deliberately left at the default security_invoker = false: this view
-- must see every blocking booking regardless of who's asking (the whole
-- point is cross-customer visibility of *ranges only*), so it evaluates
-- as its owner (the migration role, which owns `bookings` and therefore
-- bypasses that table's RLS) rather than as the querying user. Every
-- other view/function in this project should default to the opposite —
-- this is the one deliberate exception, and it works only because the
-- selected columns carry no customer-identifying information.
create view public.vehicle_busy_ranges as
  select vehicle_id, starts_at, ends_at
  from public.bookings
  where status in ('accepted', 'ready', 'active');

grant select on public.vehicle_busy_ranges to authenticated;
