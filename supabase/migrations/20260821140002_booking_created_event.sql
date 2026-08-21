-- booking_events had no row for a booking's own creation — every event
-- came from transition_booking_status(), so a fresh INSERT (whether via
-- the direct client grant or a future RPC) left the audit timeline
-- starting mid-story. This AFTER INSERT trigger closes that gap; it is
-- itself SECURITY DEFINER (owned by the table owner, same pattern as
-- every other booking_events writer) since booking_events grants
-- authenticated SELECT only, never INSERT.
create or replace function public.log_booking_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.booking_events (booking_id, actor_id, event_type, from_status, to_status, metadata)
  values (new.id, auth.uid(), 'created', null, new.status, '{}'::jsonb);
  return new;
end;
$$;

create trigger bookings_log_created
  after insert on public.bookings
  for each row execute function public.log_booking_created();
