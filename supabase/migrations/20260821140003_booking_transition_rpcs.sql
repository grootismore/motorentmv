-- Prompt 4: the eight named booking actions (PRD state machine) plus a
-- reworked transition_booking_status() underneath them.
--
-- Two changes from the Prompt 2 version of transition_booking_status():
--
--  1. Idempotent by status: if the booking is already at p_new_status,
--     it's returned as-is with no update and no new booking_events row.
--     A retried network call (tap "Accept" twice, a client retry after a
--     timeout whose first attempt actually succeeded) is then always
--     safe — the second call is a no-op read, not a duplicated audit
--     entry or a rejected "invalid transition" error.
--  2. quote_snapshot/policy_snapshot/total_amount_laari are no longer
--     function parameters. Prompt 2's version accepted them from the
--     caller, which meant *whoever could call the function* controlled
--     the price a booking was accepted at — fine for a trusted seed
--     script, not fine once real clients call this directly (nothing
--     stopped a customer or a buggy staff client from accepting their
--     own booking at 1 laari). Now the only place a quote/policy
--     snapshot can come from is compute_booking_quote()/
--     compute_booking_policy_snapshot(), computed here, server-side, at
--     the instant of acceptance, from the vehicle's actual rates and the
--     organization's actual policies — never client-supplied.
--
-- The named wrappers below (request_booking, accept_booking, ...) are
-- thin: authorization and state-machine validity both still live in
-- transition_booking_status() (and, beneath that, bookings_guard()), so
-- the wrappers exist for a clean, self-documenting call site per PRD
-- verb, not to duplicate any check.
-- The old 6-argument signature (with client-supplied snapshot/total
-- parameters) is being replaced, not overloaded: `create or replace`
-- keys on the exact parameter list, so a different one would leave the
-- old, less-safe version reachable side by side with the new one.
drop function if exists public.transition_booking_status(uuid, public.booking_status, jsonb, jsonb, integer, text);

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

grant execute on function public.transition_booking_status(uuid, public.booking_status, text) to authenticated;

-- Idempotent booking creation: a retried "request" tap for the same
-- customer/vehicle/range returns the existing open request rather than
-- creating a duplicate. The fast-path check below handles the common
-- case cheaply; the unique index + exception handler is the actual
-- concurrency-safe guarantee for two near-simultaneous requests (the
-- check-then-insert alone would still race).
create unique index bookings_open_request_unique_idx
  on public.bookings (vehicle_id, customer_id, starts_at, ends_at)
  where status in ('draft', 'requested', 'needs_info');

-- request_booking() does double duty, both named "request" in the PRD
-- state machine: pass p_booking_id to move an existing draft or
-- needs_info booking to requested (e.g. a customer resubmitting after
-- being asked for more information); omit it to create a brand new
-- booking, which always lands directly at requested (drafts aren't
-- exposed anywhere in this prompt's UI, so there's nothing to leave a
-- fresh booking in draft for).
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

grant execute on function public.request_booking(uuid, uuid, uuid, uuid, timestamptz, timestamptz, text) to authenticated;

create or replace function public.accept_booking(p_booking_id uuid)
returns public.bookings
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.transition_booking_status(p_booking_id, 'accepted');
$$;

grant execute on function public.accept_booking(uuid) to authenticated;

create or replace function public.decline_booking(p_booking_id uuid, p_reason text default null)
returns public.bookings
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.transition_booking_status(p_booking_id, 'declined', p_reason);
$$;

grant execute on function public.decline_booking(uuid, text) to authenticated;

create or replace function public.mark_booking_needs_info(p_booking_id uuid, p_note text default null)
returns public.bookings
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.transition_booking_status(p_booking_id, 'needs_info', p_note);
$$;

grant execute on function public.mark_booking_needs_info(uuid, text) to authenticated;

create or replace function public.ready_booking(p_booking_id uuid)
returns public.bookings
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.transition_booking_status(p_booking_id, 'ready');
$$;

grant execute on function public.ready_booking(uuid) to authenticated;

create or replace function public.activate_booking(p_booking_id uuid)
returns public.bookings
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.transition_booking_status(p_booking_id, 'active');
$$;

grant execute on function public.activate_booking(uuid) to authenticated;

create or replace function public.complete_booking(p_booking_id uuid)
returns public.bookings
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.transition_booking_status(p_booking_id, 'completed');
$$;

grant execute on function public.complete_booking(uuid) to authenticated;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns public.bookings
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.transition_booking_status(p_booking_id, 'cancelled', p_reason);
$$;

grant execute on function public.cancel_booking(uuid, text) to authenticated;
