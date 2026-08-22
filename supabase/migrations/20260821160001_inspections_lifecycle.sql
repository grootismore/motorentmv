-- Pickup/return inspection lifecycle (PRD Prompt 6 / §6.5): immutability
-- once a customer has acknowledged the record, a customer-only
-- acknowledgement path that the existing org-member-only UPDATE grant
-- can't express, an audit trail into booking_events, and the actual
-- lifecycle gate — a rental can't start or close out without the
-- matching inspection on file.

-- 1. Narrow the column grants. 20260821120014 granted blanket
-- insert/update to authenticated, relying only on row-level policies for
-- authorization. That's fine for the checklist fields themselves, but
-- acknowledged_by/acknowledged_at specifically must never be settable by
-- whoever performs the inspection (org staff) -- otherwise a staff client
-- could self-acknowledge on the customer's behalf at INSERT time,
-- defeating the point of a customer confirmation. Those two columns are
-- now reachable only through acknowledge_inspection() below.
revoke insert, update on public.inspections from authenticated;

grant insert (booking_id, inspection_type, odometer_km, fuel_battery_percent, condition_notes, accessories_checklist, performed_by)
  on public.inspections to authenticated;
grant update (odometer_km, fuel_battery_percent, condition_notes, accessories_checklist)
  on public.inspections to authenticated;

-- 2. Once a customer has acknowledged an inspection, the checklist itself
-- is frozen -- same immutability principle as bookings.quote_snapshot
-- (20260821120013): a condition report the customer has signed off on
-- shouldn't be quietly edited afterward. A redo is the documented
-- out-of-scope edge case from 20260821120014's own comment.
create or replace function public.inspections_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.acknowledged_at is not null and (
    new.odometer_km is distinct from old.odometer_km
    or new.fuel_battery_percent is distinct from old.fuel_battery_percent
    or new.condition_notes is distinct from old.condition_notes
    or new.accessories_checklist is distinct from old.accessories_checklist
  ) then
    raise exception 'inspection % is immutable once acknowledged', old.id using errcode = '23000';
  end if;
  return new;
end;
$$;

create trigger inspections_guard_trigger
  before update on public.inspections
  for each row execute function public.inspections_guard();

-- 3. Customer-only acknowledgement. SECURITY DEFINER (bypasses the column
-- grant above) with its own authorization check, same shape as
-- transition_booking_status(): only the booking's own customer may
-- acknowledge (an org member ran the checklist; the customer confirms
-- it), and it's idempotent -- acknowledging twice just returns the
-- already-acknowledged row rather than erroring, so a retried tap is safe.
create or replace function public.acknowledge_inspection(p_inspection_id uuid)
returns public.inspections
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_inspection public.inspections;
  v_customer_id uuid;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_inspection from public.inspections where id = p_inspection_id;
  if not found then
    raise exception 'inspection % not found', p_inspection_id using errcode = 'P0002';
  end if;

  select customer_id into v_customer_id from public.bookings where id = v_inspection.booking_id;

  if v_customer_id is distinct from v_actor then
    raise exception 'not authorized to acknowledge inspection %', p_inspection_id using errcode = '42501';
  end if;

  if v_inspection.acknowledged_at is not null then
    return v_inspection;
  end if;

  update public.inspections
  set acknowledged_by = v_actor, acknowledged_at = now()
  where id = p_inspection_id
  returning * into v_inspection;

  return v_inspection;
end;
$$;

grant execute on function public.acknowledge_inspection(uuid) to authenticated;

-- 4. Audit trail: every inspection record and every acknowledgement gets
-- a booking_events row, the same append-only timeline booking status
-- changes already use (20260821120012/20260821140002) -- so the renter
-- and customer's existing BookingTimeline shows handover activity
-- alongside status changes, with no separate UI needed.
create or replace function public.log_inspection_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, actor_id, event_type, metadata)
    values (
      new.booking_id, new.performed_by, 'inspection_recorded',
      jsonb_build_object('inspection_id', new.id, 'inspection_type', new.inspection_type)
    );
  elsif tg_op = 'UPDATE' and old.acknowledged_at is null and new.acknowledged_at is not null then
    insert into public.booking_events (booking_id, actor_id, event_type, metadata)
    values (
      new.booking_id, new.acknowledged_by, 'inspection_acknowledged',
      jsonb_build_object('inspection_id', new.id, 'inspection_type', new.inspection_type)
    );
  end if;
  return new;
end;
$$;

create trigger inspections_log_event
  after insert or update on public.inspections
  for each row execute function public.log_inspection_event();

-- 5. The actual lifecycle gate. Re-states bookings_guard() in full
-- (create or replace on the same function name, same pattern as
-- transition_booking_status's full replacement in 20260821140003) and
-- adds one more numbered check: a booking can't enter 'active' without a
-- recorded pickup inspection, and can't enter 'completed' without a
-- recorded return inspection.
--
-- Gated on the inspection *existing*, not on the customer having
-- acknowledged it. Acknowledgement is valuable on its own (the customer's
-- confirmation of condition/odometer, surfaced in the timeline above) but
-- gating vehicle handover on it would let an unresponsive customer
-- indefinitely block their own vehicle's return -- a bigger operational
-- risk to the rental business than a customer who simply hasn't opened
-- the app since drop-off. The org still physically controls the vehicle;
-- the checklist being on file is the real precondition.
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
  -- never change, including via an "adjustment" -- those are modeled as
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

  -- 4. Cross-table overlap check against availability_blocks -- only when
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

  -- 5. Handover lifecycle gate (new): active needs a pickup inspection on
  -- file, completed needs a return inspection on file. See the comment
  -- above this function for why this checks "recorded", not "acknowledged".
  if new.status = 'active' and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if not exists (
      select 1 from public.inspections i where i.booking_id = new.id and i.inspection_type = 'pickup'
    ) then
      raise exception 'booking % cannot start (active) without a recorded pickup inspection', new.id
        using errcode = '22023';
    end if;
  end if;

  if new.status = 'completed' and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if not exists (
      select 1 from public.inspections i where i.booking_id = new.id and i.inspection_type = 'return'
    ) then
      raise exception 'booking % cannot complete without a recorded return inspection', new.id
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;
