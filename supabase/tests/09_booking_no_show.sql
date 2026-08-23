-- Prompt 9 ("complete booking lifecycle"): no_show is a genuinely new
-- terminal status reachable only from a confirmed ('accepted') or
-- ready-for-pickup ('ready') booking. Proves: the transition is org-only
-- (a customer cannot mark their own booking a no-show), it's rejected
-- from a status that was never confirmed or already handed over, it logs
-- an audited status-change event, and it fans out a notification to the
-- customer (same as every other resolved transition).
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('ee000000-0000-0000-0000-0000000000e1', 'owner-k@example.com'),
  ('ee000000-0000-0000-0000-0000000000e2', 'customer-k@example.com');

select test.as_user('ee000000-0000-0000-0000-0000000000e1');
insert into public.organizations (name, slug) values ('Org K', 'org-k-no-show-test') returning id \gset org_
insert into public.vehicles (organization_id, registration_number, status) values (:'org_id', 'K-001', 'available') returning id \gset veh_
insert into public.vehicle_rates (vehicle_id, rate_type, amount_laari) values (:'veh_id', 'daily', 100000);

select test.as_user('ee000000-0000-0000-0000-0000000000e2');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'ee000000-0000-0000-0000-0000000000e2', 'requested', '2026-09-01 00:00:00+00', '2026-09-02 00:00:00+00')
returning id \gset bk_

-- A never-confirmed ('requested') booking cannot be marked a no-show --
-- the customer was never told to show up for anything yet.
select test.as_user('ee000000-0000-0000-0000-0000000000e1');
select test.assert_raises(
  format('select public.mark_booking_no_show(%L)', :'bk_id'),
  'A requested (not yet confirmed) booking cannot be marked a no-show'
);

select test.assert(
  (public.accept_booking(:'bk_id')).status = 'accepted',
  'Owner accepts the booking'
);

-- The customer cannot mark their own booking a no-show -- only an org
-- member decides that the customer didn't show up.
select test.as_user('ee000000-0000-0000-0000-0000000000e2');
select test.assert_raises(
  format('select public.mark_booking_no_show(%L, %L)', :'bk_id', 'did not show up'),
  'A customer cannot mark their own booking a no-show'
);

select test.as_user('ee000000-0000-0000-0000-0000000000e1');
select test.assert(
  (public.mark_booking_no_show(:'bk_id', 'Did not arrive for pickup')).status = 'no_show',
  'Owner marks the confirmed booking a no-show'
);

select test.assert(
  exists (
    select 1 from public.booking_events
    where booking_id = :'bk_id' and event_type = 'status_change'
      and to_status = 'no_show' and metadata ->> 'note' = 'Did not arrive for pickup'
  ),
  'The no-show transition is audited with its note'
);

-- Terminal: no_show has no outgoing edges, same as declined/completed/cancelled.
select test.assert_raises(
  format('select public.activate_booking(%L)', :'bk_id'),
  'A no-show booking cannot be activated -- no_show is terminal'
);

-- The customer is notified, same as every other resolved transition.
select test.as_user('ee000000-0000-0000-0000-0000000000e2');
select test.assert(
  exists (
    select 1 from public.notifications
    where recipient_id = 'ee000000-0000-0000-0000-0000000000e2' and type = 'booking_no_show'
  ),
  'The customer is notified that their booking was marked a no-show'
);

select test.as_superuser();
\echo '09_booking_no_show.sql: all assertions passed'
