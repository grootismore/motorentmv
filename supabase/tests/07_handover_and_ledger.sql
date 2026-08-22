-- Prompt 6: pickup/return inspection lifecycle gates, the payment ledger's
-- refund cap, the booking_events audit trail for both, and the
-- notification fan-out that rides on top of it.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('cc000000-0000-0000-0000-0000000000c1', 'owner-h6@example.com'),
  ('cc000000-0000-0000-0000-0000000000c2', 'staff-h6@example.com'),
  ('cc000000-0000-0000-0000-0000000000c3', 'customer-h6@example.com'),
  ('cc000000-0000-0000-0000-0000000000c4', 'stranger-h6@example.com');

select test.as_user('cc000000-0000-0000-0000-0000000000c1');
insert into public.organizations (name, slug) values ('Org H6', 'org-h6-handover-test') returning id \gset org_
insert into public.vehicles (organization_id, registration_number, status) values (:'org_id', 'H6-001', 'available') returning id \gset veh_
insert into public.vehicle_rates (vehicle_id, rate_type, amount_laari) values (:'veh_id', 'daily', 100000);
insert into public.organization_members (organization_id, user_id, role, status)
values (:'org_id', 'cc000000-0000-0000-0000-0000000000c2', 'staff', 'active');

select test.as_user('cc000000-0000-0000-0000-0000000000c3');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'cc000000-0000-0000-0000-0000000000c3', 'requested', '2026-12-01 00:00:00+00', '2026-12-02 00:00:00+00')
returning id \gset bk_

-- Notification fan-out, part 1: a fresh request notifies org staff, not
-- the requesting customer themselves.
select test.as_user('cc000000-0000-0000-0000-0000000000c2');
select test.assert(
  (select count(*) from public.notifications where recipient_id = 'cc000000-0000-0000-0000-0000000000c2' and type = 'booking_requested') = 1,
  'Staff is notified of a new booking request'
);
select test.as_user('cc000000-0000-0000-0000-0000000000c3');
select test.assert(
  (select count(*) from public.notifications where recipient_id = 'cc000000-0000-0000-0000-0000000000c3' and type = 'booking_requested') = 0,
  'The requesting customer is not self-notified of their own request'
);

select test.as_user('cc000000-0000-0000-0000-0000000000c1');
select test.assert((public.accept_booking(:'bk_id')).status = 'accepted', 'Owner accepts the booking');
select test.assert((public.ready_booking(:'bk_id')).status = 'ready', 'Owner marks it ready');

-- Notification fan-out, part 2: the customer learns about a status change
-- an org member caused.
select test.as_user('cc000000-0000-0000-0000-0000000000c3');
select test.assert(
  (select count(*) from public.notifications where recipient_id = 'cc000000-0000-0000-0000-0000000000c3' and type = 'booking_accepted') = 1,
  'Customer is notified when the org accepts their booking'
);

-- 1. Lifecycle gate: can't start the rental without a recorded pickup
-- inspection.
select test.as_user('cc000000-0000-0000-0000-0000000000c1');
select test.assert(
  test.capture_error_message(format('select public.activate_booking(%L)', :'bk_id'))
    = format('booking %s cannot start (active) without a recorded pickup inspection', :'bk_id'),
  'activate_booking is rejected before a pickup inspection exists, with a clear reason'
);

-- Staff records the pickup inspection.
select test.as_user('cc000000-0000-0000-0000-0000000000c2');
insert into public.inspections (booking_id, inspection_type, odometer_km, fuel_battery_percent, condition_notes, accessories_checklist, performed_by)
values (:'bk_id', 'pickup', 1200, 80, 'Minor scratch on left mirror', '{"helmet": true, "lock": true}'::jsonb, 'cc000000-0000-0000-0000-0000000000c2')
returning id \gset pickup_

select test.assert(
  (select count(*) from public.booking_events where booking_id = :'bk_id' and event_type = 'inspection_recorded') = 1,
  'Recording the pickup inspection wrote an audit event'
);
select test.as_user('cc000000-0000-0000-0000-0000000000c3');
select test.assert(
  (select count(*) from public.notifications where recipient_id = 'cc000000-0000-0000-0000-0000000000c3' and type = 'inspection_recorded') = 1,
  'Customer is notified when the pickup inspection is recorded'
);

-- Now activation succeeds.
select test.as_user('cc000000-0000-0000-0000-0000000000c1');
select test.assert((public.activate_booking(:'bk_id')).status = 'active', 'activate_booking succeeds once a pickup inspection is on file');

-- 2. Acknowledgement is customer-only, and idempotent.
select test.as_user('cc000000-0000-0000-0000-0000000000c2');
select test.assert_raises(
  format('select public.acknowledge_inspection(%L)', :'pickup_id'),
  'Staff (who ran the inspection) cannot acknowledge it -- only the booking''s own customer can'
);

select test.as_user('cc000000-0000-0000-0000-0000000000c3');
select test.assert(
  (public.acknowledge_inspection(:'pickup_id')).acknowledged_by = 'cc000000-0000-0000-0000-0000000000c3',
  'The booking''s customer can acknowledge the pickup inspection'
);
select test.assert(
  (public.acknowledge_inspection(:'pickup_id')).acknowledged_by = 'cc000000-0000-0000-0000-0000000000c3',
  'Acknowledging twice is a safe no-op'
);
select test.assert(
  (select count(*) from public.booking_events where booking_id = :'bk_id' and event_type = 'inspection_acknowledged') = 1,
  'The repeated acknowledge call did not write a second audit event'
);

-- 3. Once acknowledged, the checklist itself is immutable.
select test.as_user('cc000000-0000-0000-0000-0000000000c2');
select test.assert_raises(
  format('update public.inspections set odometer_km = 9999 where id = %L', :'pickup_id'),
  'An acknowledged inspection''s checklist can no longer be edited'
);

-- 4. Lifecycle gate: can't complete without a recorded return inspection.
select test.as_user('cc000000-0000-0000-0000-0000000000c1');
select test.assert(
  test.capture_error_message(format('select public.complete_booking(%L)', :'bk_id'))
    = format('booking %s cannot complete without a recorded return inspection', :'bk_id'),
  'complete_booking is rejected before a return inspection exists'
);

select test.as_user('cc000000-0000-0000-0000-0000000000c2');
insert into public.inspections (booking_id, inspection_type, odometer_km, fuel_battery_percent, condition_notes, accessories_checklist, performed_by)
values (:'bk_id', 'return', 1250, 60, 'Returned in good condition', '{"helmet": true, "lock": true}'::jsonb, 'cc000000-0000-0000-0000-0000000000c2')
returning id \gset return_

select test.as_user('cc000000-0000-0000-0000-0000000000c1');
select test.assert((public.complete_booking(:'bk_id')).status = 'completed', 'complete_booking succeeds once a return inspection is on file');

-- 5. Payment ledger: partial payments, the refund cap, and the audit
-- trail, all via a direct client insert (no bespoke RPC — the guard
-- trigger is what makes this safe regardless of insert path).
select test.as_user('cc000000-0000-0000-0000-0000000000c2');
insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by)
values (:'bk_id', :'org_id', 'payment', 'cash', 60000, 'cc000000-0000-0000-0000-0000000000c2')
returning id \gset pay1_

select test.assert(
  (select payment_status from public.bookings where id = :'bk_id') = 'partially_paid',
  'A partial payment recomputes payment_status to partially_paid'
);
select test.assert(
  (select count(*) from public.booking_events where booking_id = :'bk_id' and event_type = 'payment_recorded') = 1,
  'Recording a payment wrote an audit event'
);
select test.as_user('cc000000-0000-0000-0000-0000000000c3');
select test.assert(
  (select count(*) from public.notifications where recipient_id = 'cc000000-0000-0000-0000-0000000000c3' and type = 'payment_recorded') = 1,
  'Customer is notified when a payment is recorded'
);

select test.as_user('cc000000-0000-0000-0000-0000000000c2');
insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by)
values (:'bk_id', :'org_id', 'payment', 'bank_transfer', 40000, 'cc000000-0000-0000-0000-0000000000c2')
returning id \gset pay2_

select test.assert(
  (select payment_status from public.bookings where id = :'bk_id') = 'paid',
  'The second payment reaching the total recomputes payment_status to paid'
);

-- Refund cap: cannot refund more than the 100000 laari actually received.
-- (Every non-adjustment transaction must carry a method -- same check
-- constraint as a payment.)
select test.assert_raises(
  format('insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by) values (%L, %L, %L, %L, %L, %L)',
    :'bk_id', :'org_id', 'refund', 'cash', 150000, 'cc000000-0000-0000-0000-0000000000c2'),
  'A refund larger than the total paid is rejected'
);

insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by)
values (:'bk_id', :'org_id', 'refund', 'cash', 20000, 'cc000000-0000-0000-0000-0000000000c2')
returning id \gset refund1_

select test.assert(
  (select payment_status from public.bookings where id = :'bk_id') = 'partially_refunded',
  'A partial refund recomputes payment_status to partially_refunded'
);
select test.assert(
  (select count(*) from public.booking_events where booking_id = :'bk_id' and event_type = 'refund_recorded') = 1,
  'Recording the refund wrote an audit event'
);

-- A second refund for exactly what's left (80000 already refunded 20000
-- of it -> 80000 still refundable) succeeds; one more laari does not.
select test.assert_raises(
  format('insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by) values (%L, %L, %L, %L, %L, %L)',
    :'bk_id', :'org_id', 'refund', 'cash', 80001, 'cc000000-0000-0000-0000-0000000000c2'),
  'A refund exceeding exactly what remains refundable is rejected'
);
insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by)
values (:'bk_id', :'org_id', 'refund', 'cash', 80000, 'cc000000-0000-0000-0000-0000000000c2');
select test.assert(
  (select payment_status from public.bookings where id = :'bk_id') = 'refunded',
  'Refunding everything left recomputes payment_status to refunded'
);

-- An adjustment (e.g. a late fee) carries no payment method.
select test.assert_raises(
  format('insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by) values (%L, %L, %L, %L, %L, %L)',
    :'bk_id', :'org_id', 'adjustment', 'cash', 5000, 'cc000000-0000-0000-0000-0000000000c2'),
  'An adjustment transaction cannot carry a payment method'
);
insert into public.transactions (booking_id, organization_id, type, amount_laari, recorded_by, note)
values (:'bk_id', :'org_id', 'adjustment', 5000, 'cc000000-0000-0000-0000-0000000000c2', 'late fee');
select test.assert(
  (select count(*) from public.booking_events where booking_id = :'bk_id' and event_type = 'adjustment_recorded') = 1,
  'Recording the adjustment wrote an audit event'
);

-- 6. Private storage: booking-documents is scoped to booking participants
-- only, same as the inspections/documents rows themselves.
select test.as_user('cc000000-0000-0000-0000-0000000000c2');
insert into storage.objects (bucket_id, name, owner) values ('booking-documents', :'bk_id' || '/pickup-1.jpg', 'cc000000-0000-0000-0000-0000000000c2');

select test.as_user('cc000000-0000-0000-0000-0000000000c3');
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'booking-documents' and name = :'bk_id' || '/pickup-1.jpg') = 1,
  'The booking''s own customer can read its inspection photo object'
);

select test.as_user('cc000000-0000-0000-0000-0000000000c4');
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'booking-documents' and name = :'bk_id' || '/pickup-1.jpg') = 0,
  'A stranger to the booking cannot read its inspection photo object'
);
select test.assert_raises(
  format('insert into storage.objects (bucket_id, name, owner) values (%L, %L, %L)',
    'booking-documents', :'bk_id' || '/stranger.jpg', 'cc000000-0000-0000-0000-0000000000c4'),
  'A stranger to the booking cannot upload an inspection photo object for it'
);

select test.as_superuser();
\echo '07_handover_and_ledger.sql: all assertions passed'
