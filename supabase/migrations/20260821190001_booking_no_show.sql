-- Prompt 9 ("complete booking lifecycle"): adds `no_show` as a genuinely
-- new capability this schema didn't have -- a confirmed booking where the
-- customer never came to collect the vehicle. Everything else in Prompt
-- 9's requested vocabulary (draft, requested, confirmed, rejected,
-- cancelled, ready_for_pickup, active, overdue, completed) already exists
-- here under the PRD's own names (accepted, declined, ready, ...) and is
-- mapped at the display layer instead (src/features/bookings/status.ts) --
-- the tested state machine, RPCs and RLS in this file's siblings are not
-- being redesigned or renamed at the schema level.
--
-- `needs_info` has no equivalent in Prompt 9's vocabulary either; it's
-- kept as-is rather than removed, since Prompt 9 says to continue from
-- the existing implementation, not drop working capability it simply
-- doesn't mention.
--
-- ALTER TYPE ... ADD VALUE and its first use below are safe in the same
-- migration file: psql (run via -f, no explicit BEGIN in this repo's
-- migrations) autocommits each statement, so 'no_show' is already
-- committed by the time the INSERT/CREATE OR REPLACE statements that use
-- it run.
alter type public.booking_status add value 'no_show';

-- A no-show is only reachable from a confirmed booking the customer
-- didn't show up for -- 'accepted' (confirmed, pickup not yet marked
-- ready) or 'ready' (ready for pickup) -- never from 'active' (the
-- vehicle was actually handed over, so it can't also be a no-show) or
-- from an already-terminal status. Terminal itself: no outgoing edges,
-- same as 'declined'/'completed'/'cancelled'.
insert into public.booking_status_transitions (from_status, to_status) values
  ('accepted', 'no_show'),
  ('ready', 'no_show');

create or replace function public.mark_booking_no_show(p_booking_id uuid, p_reason text default null)
returns public.bookings
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.transition_booking_status(p_booking_id, 'no_show', p_reason);
$$;

grant execute on function public.mark_booking_no_show(uuid, text) to authenticated;

-- Full restatement of notify_on_booking_event() (see 20260821160003) to
-- add 'no_show' to the set of transitions the customer is notified about
-- -- same pattern bookings_guard() has already been restated under twice
-- (20260821140001, 20260821160001) rather than edited in place.
create or replace function public.notify_on_booking_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
  v_payload jsonb;
begin
  select * into v_booking from public.bookings where id = new.booking_id;
  if not found then
    return new;
  end if;

  v_payload := jsonb_build_object('booking_id', new.booking_id, 'event_id', new.id) || new.metadata;

  if new.event_type in ('created', 'status_change') then
    if new.to_status = 'requested' then
      -- A new or resubmitted request: every active org member should see
      -- it in their inbox notifications, not just the bookings list.
      insert into public.notifications (recipient_id, type, payload)
      select m.user_id, 'booking_requested', v_payload
      from public.organization_members m
      where m.organization_id = v_booking.organization_id
        and m.status = 'active'
        and m.user_id is distinct from new.actor_id;
    elsif new.to_status in
      ('accepted', 'declined', 'needs_info', 'ready', 'active', 'completed', 'cancelled', 'no_show')
    then
      -- The customer learns about every other transition on their own
      -- booking, unless they're the one who just caused it (e.g.
      -- cancelling their own request needs no "your booking was
      -- cancelled" notification about their own action).
      if v_booking.customer_id is distinct from new.actor_id then
        insert into public.notifications (recipient_id, type, payload)
        values (v_booking.customer_id, 'booking_' || new.to_status, v_payload);
      end if;
    end if;
  elsif new.event_type = 'inspection_recorded' then
    if v_booking.customer_id is distinct from new.actor_id then
      insert into public.notifications (recipient_id, type, payload)
      values (v_booking.customer_id, 'inspection_recorded', v_payload);
    end if;
  elsif new.event_type in ('payment_recorded', 'refund_recorded', 'adjustment_recorded') then
    if v_booking.customer_id is distinct from new.actor_id then
      insert into public.notifications (recipient_id, type, payload)
      values (v_booking.customer_id, new.event_type, v_payload);
    end if;
  end if;

  return new;
end;
$$;
