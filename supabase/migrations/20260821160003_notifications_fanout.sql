-- Notification generation (PRD Prompt 6 / §8/§9). 20260821120018 created
-- the notifications table itself with "always created server-side... by
-- the same code path that causes the underlying event" as the rule, but
-- left the actual generation unbuilt. booking_events is already the one
-- append-only choke point every relevant event passes through --
-- transition_booking_status() (status changes), log_booking_created()
-- (creation), log_inspection_event() and log_transaction_created() (both
-- 20260821160001/20260821160002) -- so a single AFTER INSERT trigger on
-- booking_events fans out to notifications for all of them at once,
-- rather than duplicating fan-out logic into every writer.
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
    elsif new.to_status in ('accepted', 'declined', 'needs_info', 'ready', 'active', 'completed', 'cancelled') then
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

create trigger booking_events_notify
  after insert on public.booking_events
  for each row execute function public.notify_on_booking_event();
