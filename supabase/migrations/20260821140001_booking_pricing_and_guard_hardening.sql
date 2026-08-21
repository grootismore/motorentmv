-- Prompt 4: pricing/quote computation, plus two guard-trigger hardenings
-- discovered while building the transition RPCs.
--
--  1. compute_booking_quote()/compute_booking_policy_snapshot() are the
--     single source of truth for what a booking's quote_snapshot and
--     policy_snapshot contain. They are SECURITY INVOKER (the default) so
--     a customer previewing a price only ever sees what their own RLS
--     visibility already allows (vehicle_rates_select_for_discovery), and
--     transition_booking_status() (added below) calls them itself rather
--     than trusting a client-supplied snapshot — see that migration for
--     why that matters.
--  2. bookings_guard() gains a check blocking starts_at/ends_at edits once
--     a booking has left draft/requested. Without this, a direct client
--     UPDATE (starts_at/ends_at are client-writable columns, see
--     20260821120011) on an accepted/ready/active booking could trigger
--     the bookings EXCLUDE constraint against a *different customer's*
--     booking on the same vehicle, and Postgres's native exclusion-
--     violation error includes the conflicting key's exact date range in
--     its DETAIL — exactly the "leaking another customer's data" the PRD
--     warns against. Rescheduling a confirmed booking isn't in scope for
--     this prompt; closing this path is cheaper than laundering the
--     error message for every possible caller.
--  3. Both guard triggers' own conflict messages drop `errcode = '23P01'`
--     (exclusion_violation) in favor of the default P0001. They were
--     never real exclusion-constraint violations — they're plain `raise
--     exception` calls — so sharing 23P01 with the bookings table's real
--     GiST exclusion constraint made the two indistinguishable to a
--     caller. transition_booking_status() needs to catch *only* the real
--     one (to replace Postgres's own detail-leaking message) and let
--     these already-safe, already-descriptive messages pass through
--     unchanged.

create or replace function public.compute_booking_quote(
  p_vehicle_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_deposit integer;
  v_daily public.vehicle_rates;
  v_hourly public.vehicle_rates;
  v_duration_hours numeric;
  v_rate_type public.rate_type;
  v_rate_amount integer;
  v_units integer;
  v_subtotal integer;
begin
  if p_ends_at <= p_starts_at then
    raise exception 'ends_at must be after starts_at' using errcode = '22023';
  end if;

  select deposit_amount_laari into v_deposit from public.vehicles where id = p_vehicle_id;
  if not found then
    raise exception 'vehicle % not found', p_vehicle_id using errcode = 'P0002';
  end if;

  select * into v_daily from public.vehicle_rates
    where vehicle_id = p_vehicle_id and rate_type = 'daily' and effective_to is null;
  select * into v_hourly from public.vehicle_rates
    where vehicle_id = p_vehicle_id and rate_type = 'hourly' and effective_to is null;

  v_duration_hours := extract(epoch from (p_ends_at - p_starts_at)) / 3600.0;

  -- Rounding rule (PRD §16 leaves this open; documented here rather than
  -- left implicit): a rental of 24 hours or more bills by the day,
  -- rounding any partial day up to a full day; a shorter rental bills by
  -- the hour, rounding any partial hour up to a full hour. A vehicle
  -- missing the rate its duration would normally use falls back to
  -- whichever single rate it does have.
  if v_daily.id is not null and (v_duration_hours >= 24 or v_hourly.id is null) then
    v_rate_type := 'daily';
    v_rate_amount := v_daily.amount_laari;
    v_units := greatest(1, ceil(v_duration_hours / 24.0)::integer);
  elsif v_hourly.id is not null then
    v_rate_type := 'hourly';
    v_rate_amount := v_hourly.amount_laari;
    v_units := greatest(1, ceil(v_duration_hours)::integer);
  else
    raise exception 'vehicle % has no active rate configured', p_vehicle_id using errcode = 'P0002';
  end if;

  v_subtotal := v_rate_amount * v_units;

  return jsonb_build_object(
    'rate_type', v_rate_type,
    'rate_amount_laari', v_rate_amount,
    'units', v_units,
    'subtotal_laari', v_subtotal,
    'discount_laari', 0,
    'delivery_fee_laari', 0,
    'deposit_amount_laari', v_deposit,
    'total_laari', v_subtotal,
    'computed_at', now()
  );
end;
$$;

grant execute on function public.compute_booking_quote(uuid, timestamptz, timestamptz) to authenticated;

-- policy_snapshot is just the organization's current `policies` jsonb,
-- taken at acceptance time and then frozen forever on that booking by the
-- immutability check in bookings_guard() — so a later policy change never
-- retroactively changes the terms a customer already agreed to.
create or replace function public.compute_booking_policy_snapshot(p_organization_id uuid)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(policies, '{}'::jsonb) from public.organizations where id = p_organization_id;
$$;

grant execute on function public.compute_booking_policy_snapshot(uuid) to authenticated;

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

    -- 1b. A booking's dates are only negotiable while it's still a draft
    -- or an unactioned request. Once it's been accepted (or further
    -- along), changing starts_at/ends_at is a reschedule, which needs its
    -- own explicit flow (not built in this prompt) rather than falling
    -- out of the generic participant UPDATE grant — see this migration's
    -- header comment for why that path is closed here.
    if old.status not in ('draft', 'requested')
      and (new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at) then
      raise exception 'booking % dates cannot be changed once % — cancel and create a new booking instead', old.id, old.status
        using errcode = '22023';
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
      raise exception 'vehicle % is blocked (%) for the requested period', new.vehicle_id, v_conflict.reason;
    end if;
  end if;

  return new;
end;
$$;

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
    raise exception 'vehicle % already has a confirmed booking (%) in that range', new.vehicle_id, v_conflict.id;
  end if;

  return new;
end;
$$;
