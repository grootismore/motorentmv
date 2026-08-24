-- Two new hard requirements in the booking lifecycle:
--
-- 1. A customer can't request a booking (or resubmit one after
--    needs_info) until they have a license and an ID/passport photo on
--    file (src/features/documents, Prompt 13's profile-scoped
--    documents) -- catches an unserious or fraudulent request before the
--    renter ever reviews it. Enforced inside request_booking() and
--    transition_booking_status() -- the only two paths that ever move a
--    booking to 'requested' -- rather than in bookings_guard() itself:
--    there is no `grant insert on public.bookings to authenticated`
--    anywhere in this schema (booking creation only ever happens through
--    these SECURITY DEFINER RPCs), so gating here is already airtight,
--    and it avoids forcing every existing SQL test's raw
--    `insert into public.bookings (...)` fixture (none of which upload
--    documents first, since they predate this requirement) to grow a
--    document setup step it doesn't otherwise need.
-- 2. If the vehicle's rate carries a refundable deposit
--    (vehicles.deposit_amount_laari, frozen into quote_snapshot at
--    acceptance), at least that much must already be recorded as paid
--    toward the booking before the renter can mark it 'active' (hand
--    over the keys). This IS in bookings_guard() -- 'active' can only
--    ever be reached through activate_booking()/transition_booking_
--    status() in real use, and it's a no-op for every existing test
--    fixture (vehicles.deposit_amount_laari defaults to 0), so there is
--    no equivalent test-fixture cost to placing it there for the
--    defense-in-depth this table's own lifecycle gates already model
--    (see the pickup-inspection check right above it).
--
-- Neither the deposit check nor the document check adds a new column or
-- flag -- the transactions ledger doesn't distinguish deposit vs
-- rental-fee payments (nothing upstream asks for that distinction), so
-- "has the customer paid at least the deposit's worth toward this
-- booking" is the honest, simplest proxy.

create or replace function public.customer_has_required_documents(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1 from public.documents
      where profile_id = p_customer_id and document_type = 'license' and status <> 'rejected'
    )
    and exists (
      select 1 from public.documents
      where profile_id = p_customer_id and document_type = 'id_card' and status <> 'rejected'
    );
$$;

-- Full restatement of bookings_guard() (see 20260821160001's own comment
-- on this pattern -- `create or replace` on the same function name, not a
-- new one), adding check 6 (the deposit gate) right after the existing
-- pickup-inspection check it pairs with.
create or replace function public.bookings_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_blocking_statuses public.booking_status[] := array['accepted', 'ready', 'active']::public.booking_status[];
  v_conflict record;
  v_deposit integer;
  v_net_paid integer;
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

  -- 5. Handover lifecycle gate: active needs a pickup inspection on file,
  -- completed needs a return inspection on file. See 20260821160001's own
  -- comment on why this checks "recorded", not "acknowledged".
  if new.status = 'active' and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if not exists (
      select 1 from public.inspections i where i.booking_id = new.id and i.inspection_type = 'pickup'
    ) then
      raise exception 'booking % cannot start (active) without a recorded pickup inspection', new.id
        using errcode = '22023';
    end if;

    -- 6. Deposit gate (new). Zero/null deposit (no deposit configured on
    -- the vehicle at acceptance) is a no-op, same as every booking before
    -- this migration.
    v_deposit := coalesce((new.quote_snapshot ->> 'deposit_amount_laari')::integer, 0);
    if v_deposit > 0 then
      select coalesce(sum(amount_laari) filter (where type = 'payment'), 0)
           - coalesce(sum(amount_laari) filter (where type = 'refund'), 0)
        into v_net_paid
        from public.transactions
        where booking_id = new.id;

      if v_net_paid < v_deposit then
        raise exception
          'booking % cannot start (active) until its % laari deposit is recorded as paid (% laari recorded so far)',
          new.id, v_deposit, v_net_paid
          using errcode = '22023';
      end if;
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

-- Full restatement of transition_booking_status() (20260821140003), adding
-- the document check for the resubmit-after-needs_info path (the *other*
-- way a booking reaches 'requested', alongside request_booking() below).
create or replace function public.transition_booking_status(
  p_booking_id uuid,
  p_new_status public.booking_status,
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
  v_quote jsonb;
  v_policy jsonb;
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

  if not (v_is_customer or v_is_org_member or public.is_platform_admin()) then
    raise exception 'not authorized to change booking %', p_booking_id using errcode = '42501';
  end if;

  -- Idempotent short-circuit: already there, so this is a no-op — return
  -- the row unchanged rather than re-running the update (which would be
  -- rejected as "invalid transition X -> X" anyway) or logging a
  -- duplicate event. Checked before the finer-grained customer authority
  -- check below, on purpose: a customer confirming a state their booking
  -- has already reached (e.g. tapping "cancel" again on a booking an org
  -- member has since accepted, or that they already cancelled) is a safe
  -- read, not a transition attempt that check needs to gate.
  if v_booking.status = p_new_status then
    return v_booking;
  end if;

  -- A customer (who isn't also an org member) may only: cancel their own
  -- request before it's resolved, or resubmit it after being asked for
  -- more information. Every other transition — accept, decline,
  -- needs_info, ready, activate, complete — is an organization operation
  -- (any active member; accepting/running the front desk are day-to-day
  -- staff tasks per PRD §5, not owner/manager-only).
  if v_is_customer and not v_is_org_member then
    if not (
      (p_new_status = 'cancelled' and v_booking.status in ('draft', 'requested', 'needs_info'))
      or (p_new_status = 'requested' and v_booking.status in ('draft', 'needs_info'))
    ) then
      raise exception 'not authorized for this transition' using errcode = '42501';
    end if;
  end if;

  -- Document requirement (new): resubmitting after needs_info still needs
  -- a license + ID/passport on file, same bar as a brand-new request in
  -- request_booking() below.
  if p_new_status = 'requested' and not public.customer_has_required_documents(v_booking.customer_id) then
    raise exception
      'booking % cannot be requested until the customer has uploaded a license and ID/passport photo',
      p_booking_id
      using errcode = '22023';
  end if;

  v_from_status := v_booking.status;

  if p_new_status = 'accepted' then
    v_quote := public.compute_booking_quote(v_booking.vehicle_id, v_booking.starts_at, v_booking.ends_at);
    v_policy := public.compute_booking_policy_snapshot(v_booking.organization_id);
  end if;

  begin
    update public.bookings
    set
      status = p_new_status,
      -- bare column references are the pre-update (old) values; this
      -- only ever fills a null snapshot, never overwrites one, so
      -- immutability holds even if this branch is ever reached twice.
      quote_snapshot = coalesce(quote_snapshot, v_quote),
      policy_snapshot = coalesce(policy_snapshot, v_policy),
      total_amount_laari = coalesce(total_amount_laari, (v_quote ->> 'total_laari')::integer)
    where id = p_booking_id
    returning * into v_booking;
  exception
    when exclusion_violation then
      -- The bookings table's own GiST exclusion constraint is the actual,
      -- concurrency-safe source of truth for "no double booking" — this
      -- only fires when this transition would create a real conflict.
      -- Postgres's native error DETAIL includes the conflicting booking's
      -- exact date range, which belongs to a different customer; replace
      -- it with a message that explains the conflict without repeating
      -- that detail (PRD §6.4).
      raise exception 'This vehicle already has a confirmed booking for an overlapping period. Choose different dates or another vehicle.'
        using errcode = '23P01';
  end;

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

-- Full restatement of request_booking() (20260821140003), adding the same
-- document check for the brand-new-booking path.
create or replace function public.request_booking(
  p_booking_id uuid default null,
  p_organization_id uuid default null,
  p_vehicle_id uuid default null,
  p_customer_id uuid default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_notes text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_booking_id is not null then
    return public.transition_booking_status(p_booking_id, 'requested');
  end if;

  if p_organization_id is null or p_vehicle_id is null or p_customer_id is null
    or p_starts_at is null or p_ends_at is null then
    raise exception 'organization_id, vehicle_id, customer_id, starts_at and ends_at are required to request a new booking'
      using errcode = '22023';
  end if;

  if not (p_customer_id = v_actor or public.is_org_member(p_organization_id)) then
    raise exception 'not authorized to request this booking' using errcode = '42501';
  end if;

  -- Document requirement (new): see this migration's own header comment.
  if not public.customer_has_required_documents(p_customer_id) then
    raise exception 'Upload a license and ID/passport photo before requesting a booking'
      using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where vehicle_id = p_vehicle_id
    and customer_id = p_customer_id
    and starts_at = p_starts_at
    and ends_at = p_ends_at
    and status in ('draft', 'requested', 'needs_info')
  limit 1;

  if found then
    return v_booking;
  end if;

  begin
    insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at, notes)
    values (p_organization_id, p_vehicle_id, p_customer_id, 'requested', p_starts_at, p_ends_at, p_notes)
    returning * into v_booking;
  exception
    when unique_violation then
      select * into v_booking
      from public.bookings
      where vehicle_id = p_vehicle_id
        and customer_id = p_customer_id
        and starts_at = p_starts_at
        and ends_at = p_ends_at
        and status in ('draft', 'requested', 'needs_info')
      limit 1;
  end;

  return v_booking;
end;
$$;
