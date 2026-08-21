-- Server-side overlap protection + the booking state machine.
--
-- Two independent guarantees compose here:
--  1. bookings has a GiST exclusion constraint (previous migration) that
--     makes booking-vs-booking overlap impossible to commit, atomically,
--     regardless of concurrency — Postgres enforces this at the index
--     level, no application logic can race around it.
--  2. booking-vs-availability_block is a *cross-table* check that no
--     single exclusion constraint can express. The trigger below takes a
--     per-vehicle advisory lock before checking, and the mirrored trigger
--     on availability_blocks takes the same lock keyed the same way — so
--     the two code paths that could conflict always serialize on the one
--     vehicle they're both touching, closing the race a plain "check then
--     write" would leave open.
--
-- This is what "client-side checks alone are insufficient" (PRD §6.2)
-- means in practice: every one of these rules fires no matter what
-- inserted/updated the row — a raw client UPDATE, a bulk script, or the
-- transition_booking_status() RPC below.

-- Allowed state-machine edges (PRD §6.3). needs_info's own outgoing edges
-- and overdue's resolution aren't specified in the PRD table — the ones
-- below are the reasonable inferred defaults (customer resubmits or the
-- booking is declined/cancelled from needs_info; an overdue rental is
-- eventually completed or cancelled) and should be confirmed against
-- real renter workflows in Prompt 4, not treated as settled product
-- decisions.
create table public.booking_status_transitions (
  from_status public.booking_status not null,
  to_status public.booking_status not null,
  primary key (from_status, to_status)
);

comment on table public.booking_status_transitions is
  'Reference/lookup data read only from SECURITY DEFINER functions — never exposed to API roles directly.';

insert into public.booking_status_transitions (from_status, to_status) values
  ('draft', 'requested'),
  ('draft', 'cancelled'),
  ('requested', 'accepted'),
  ('requested', 'declined'),
  ('requested', 'needs_info'),
  ('requested', 'cancelled'),
  ('needs_info', 'requested'),
  ('needs_info', 'declined'),
  ('needs_info', 'cancelled'),
  ('accepted', 'ready'),
  ('accepted', 'cancelled'),
  ('ready', 'active'),
  ('ready', 'cancelled'),
  ('active', 'completed'),
  ('active', 'overdue'),
  ('active', 'cancelled'),
  ('overdue', 'completed'),
  ('overdue', 'cancelled');

alter table public.booking_status_transitions enable row level security;
-- No policies, no grants to anon/authenticated: this table is never
-- reachable through the Data API at all, by omission rather than a
-- permissive-but-empty RLS policy set (which would also deny everyone,
-- but the missing GRANT is the actual enforcement here).

create or replace function public.bookings_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_blocking_statuses public.booking_status[] := array['accepted', 'ready', 'active']::public.booking_status[];
  v_conflict record;
begin
  -- 1. Snapshot immutability (PRD §6.4): once set, quote/policy snapshots
  -- never change, including via an "adjustment" — those are modeled as
  -- separate transactions rows, not snapshot edits.
  if tg_op = 'UPDATE' then
    if old.quote_snapshot is not null and new.quote_snapshot is distinct from old.quote_snapshot then
      raise exception 'quote_snapshot is immutable once set (booking %)', old.id
        using errcode = '23000';
    end if;
    if old.policy_snapshot is not null and new.policy_snapshot is distinct from old.policy_snapshot then
      raise exception 'policy_snapshot is immutable once set (booking %)', old.id
        using errcode = '23000';
    end if;
  end if;

  -- 2. State machine.
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'requested') then
      raise exception 'a new booking must start in draft or requested, got %', new.status
        using errcode = '22023';
    end if;
  elsif new.status is distinct from old.status then
    if not exists (
      select 1 from public.booking_status_transitions t
      where t.from_status = old.status and t.to_status = new.status
    ) then
      raise exception 'invalid booking transition % -> %', old.status, new.status
        using errcode = '22023';
    end if;
  end if;

  -- 3. A blocking state requires a quote snapshot to already exist.
  if new.status = any (v_blocking_statuses) and new.quote_snapshot is null then
    raise exception 'booking % cannot enter % without a quote_snapshot', new.id, new.status
      using errcode = '22023';
  end if;

  -- 4. Cross-table overlap check against availability_blocks — only when
  -- something that could actually change the answer changed (entering a
  -- blocking state, or the vehicle/range while already in one). Without
  -- this guard, unrelated updates (e.g. a payment recomputing
  -- payment_status) would needlessly re-take the advisory lock on every
  -- write, and could contend with a concurrent availability_blocks write
  -- for no reason.
  if new.status = any (v_blocking_statuses) and (
    tg_op = 'INSERT'
    or new.status is distinct from old.status
    or new.vehicle_id is distinct from old.vehicle_id
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
  ) then
    perform pg_advisory_xact_lock(hashtextextended(new.vehicle_id::text, 0));

    select ab.id, ab.reason into v_conflict
    from public.availability_blocks ab
    where ab.vehicle_id = new.vehicle_id
      and tstzrange(ab.starts_at, ab.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
    limit 1;

    if found then
      raise exception 'vehicle % is blocked (%) for the requested period', new.vehicle_id, v_conflict.reason
        using errcode = '23P01';
    end if;
  end if;

  return new;
end;
$$;

create trigger bookings_guard_trigger
  before insert or update on public.bookings
  for each row execute function public.bookings_guard();

-- Mirror check on availability_blocks: a maintenance/manual block can't
-- be created or moved onto a vehicle range already covered by a
-- confirmed booking. Same advisory lock key as above, so the two
-- directions can't race each other.
create or replace function public.availability_blocks_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conflict record;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.vehicle_id::text, 0));

  select b.id into v_conflict
  from public.bookings b
  where b.vehicle_id = new.vehicle_id
    and b.status in ('accepted', 'ready', 'active')
    and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  limit 1;

  if found then
    raise exception 'vehicle % already has a confirmed booking (%) in that range', new.vehicle_id, v_conflict.id
      using errcode = '23P01';
  end if;

  return new;
end;
$$;

create trigger availability_blocks_guard_trigger
  before insert or update on public.availability_blocks
  for each row execute function public.availability_blocks_guard();

-- The one, audited, overlap-safe path to change a booking's status.
-- SECURITY DEFINER (bypasses the column-level grants that keep `status`,
-- the snapshots, `total_amount_laari` and `payment_status` off-limits to
-- direct client UPDATEs) but re-implements its own authorization check,
-- since bypassing RLS means RLS isn't doing that job here.
create or replace function public.transition_booking_status(
  p_booking_id uuid,
  p_new_status public.booking_status,
  p_quote_snapshot jsonb default null,
  p_policy_snapshot jsonb default null,
  p_total_amount_laari integer default null,
  p_note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
  v_actor uuid := auth.uid();
  v_is_customer boolean;
  v_is_org_member boolean;
  v_from_status public.booking_status;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking % not found', p_booking_id using errcode = 'P0002';
  end if;

  v_is_customer := v_booking.customer_id = v_actor;
  v_is_org_member := public.is_org_member(v_booking.organization_id);
  v_from_status := v_booking.status;

  if not (v_is_customer or v_is_org_member or public.is_platform_admin()) then
    raise exception 'not authorized to change booking %', p_booking_id using errcode = '42501';
  end if;

  -- Customers may only cancel their own request while it hasn't been
  -- acted on yet; every other transition is an organization operation
  -- (any active member — accepting, running checklists, etc. are
  -- day-to-day staff tasks per PRD §5, not owner/manager-only).
  if v_is_customer and not v_is_org_member then
    if not (p_new_status = 'cancelled' and v_booking.status in ('draft', 'requested')) then
      raise exception 'customers may only cancel a draft or requested booking' using errcode = '42501';
    end if;
  end if;

  update public.bookings
  set
    status = p_new_status,
    quote_snapshot = coalesce(p_quote_snapshot, quote_snapshot),
    policy_snapshot = coalesce(p_policy_snapshot, policy_snapshot),
    total_amount_laari = coalesce(p_total_amount_laari, total_amount_laari)
  where id = p_booking_id
  returning * into v_booking;

  insert into public.booking_events (booking_id, actor_id, event_type, from_status, to_status, metadata)
  values (
    p_booking_id,
    v_actor,
    'status_change',
    v_from_status,
    p_new_status,
    case when p_note is null then '{}'::jsonb else jsonb_build_object('note', p_note) end
  );

  return v_booking;
end;
$$;

grant execute on function public.transition_booking_status(uuid, public.booking_status, jsonb, jsonb, integer, text) to authenticated;
