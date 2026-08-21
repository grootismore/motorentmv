-- Prompt 4: the renter booking engine — boundaries, time zones, rounding,
-- cancellations, idempotency and conflict-message leakage. The genuine
-- concurrent-request race (two separate live connections) is covered
-- separately by concurrency-test.sh; this file proves the single-
-- connection logic each of those requests depends on.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('aa000000-0000-0000-0000-0000000000a1', 'owner-h5@example.com'),
  ('aa000000-0000-0000-0000-0000000000a2', 'customer-h5-2@example.com'),
  ('aa000000-0000-0000-0000-0000000000a3', 'customer-h5-3@example.com'),
  ('aa000000-0000-0000-0000-0000000000a4', 'customer-h5-4@example.com'),
  ('aa000000-0000-0000-0000-0000000000a5', 'customer-h5-5@example.com'),
  ('aa000000-0000-0000-0000-0000000000a6', 'customer-h5-6@example.com'),
  ('aa000000-0000-0000-0000-0000000000a7', 'customer-h5-7@example.com'),
  ('aa000000-0000-0000-0000-0000000000a8', 'customer-h5-8@example.com'),
  ('aa000000-0000-0000-0000-0000000000a9', 'customer-h5-9@example.com');

select test.as_user('aa000000-0000-0000-0000-0000000000a1');
insert into public.organizations (name, slug) values ('Org H', 'org-h-booking-engine-test') returning id \gset org_
insert into public.vehicles (organization_id, registration_number, status) values (:'org_id', 'H-001', 'available') returning id \gset veh_
insert into public.vehicle_rates (vehicle_id, rate_type, amount_laari) values (:'veh_id', 'daily', 100000);

insert into public.vehicles (organization_id, registration_number, status) values (:'org_id', 'H-002', 'available') returning id \gset hourly_veh_
insert into public.vehicle_rates (vehicle_id, rate_type, amount_laari) values (:'hourly_veh_id', 'hourly', 1000);

-- 1. Boundary: back-to-back bookings on the same vehicle, one ending the
-- exact instant the other starts, must NOT be treated as overlapping
-- (this is the '[)' half-open fix — closed '[]' bounds would have
-- rejected the second accept here).
select test.as_user('aa000000-0000-0000-0000-0000000000a2');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'aa000000-0000-0000-0000-0000000000a2', 'requested', '2026-09-01 00:00:00+00', '2026-09-02 00:00:00+00')
returning id \gset boundary_1_

select test.as_user('aa000000-0000-0000-0000-0000000000a3');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'aa000000-0000-0000-0000-0000000000a3', 'requested', '2026-09-02 00:00:00+00', '2026-09-03 00:00:00+00')
returning id \gset boundary_2_

select test.as_user('aa000000-0000-0000-0000-0000000000a1');
select test.assert(
  (public.accept_booking(:'boundary_1_id')).status = 'accepted',
  'Boundary: first back-to-back booking accepts'
);
select test.assert(
  (public.accept_booking(:'boundary_2_id')).status = 'accepted',
  'Boundary: second booking starting the instant the first ends also accepts (half-open range, no false conflict)'
);

-- 2. Time zones: the same instant expressed with a +05:00 offset and as Z
-- must be recognized as the identical range (timestamptz stores an
-- absolute instant, not the offset it was written with) — accepting one
-- must block the other.
select test.as_user('aa000000-0000-0000-0000-0000000000a4');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'aa000000-0000-0000-0000-0000000000a4', 'requested', '2026-09-10 05:00:00+05', '2026-09-11 05:00:00+05')
returning id \gset tz_1_

select test.as_user('aa000000-0000-0000-0000-0000000000a5');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'aa000000-0000-0000-0000-0000000000a5', 'requested', '2026-09-10 00:00:00+00', '2026-09-11 00:00:00+00')
returning id \gset tz_2_

select test.as_user('aa000000-0000-0000-0000-0000000000a1');
select test.assert(
  (public.accept_booking(:'tz_1_id')).status = 'accepted',
  'Time zone: booking requested in +05:00 accepts'
);
select test.assert_raises(
  format('select public.accept_booking(%L)', :'tz_2_id'),
  'Time zone: the identical instant expressed in UTC is recognized as the same range and rejected as a conflict'
);

-- 3. Genuine overlap (not adjacent) is still rejected — proving the
-- half-open fix narrowed the check to exact-instant adjacency only, and
-- didn't loosen it into missing real overlaps.
select test.as_user('aa000000-0000-0000-0000-0000000000a6');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'aa000000-0000-0000-0000-0000000000a6', 'requested', '2026-09-20 09:00:00+00', '2026-09-20 11:00:00+00')
returning id \gset overlap_1_

select test.as_user('aa000000-0000-0000-0000-0000000000a7');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'aa000000-0000-0000-0000-0000000000a7', 'requested', '2026-09-20 10:00:00+00', '2026-09-20 12:00:00+00')
returning id \gset overlap_2_

select test.as_user('aa000000-0000-0000-0000-0000000000a1');
select test.assert(
  (public.accept_booking(:'overlap_1_id')).status = 'accepted',
  'Overlap: first of a genuinely overlapping pair accepts'
);

-- Checked via capture_error_message (rather than assert_raises) so we can
-- also assert on the error text: it must explain the conflict without
-- repeating the other booking's id or exact dates (PRD §6.4).
select test.assert(
  test.capture_error_message(format('select public.accept_booking(%L)', :'overlap_2_id'))
    = 'This vehicle already has a confirmed booking for an overlapping period. Choose different dates or another vehicle.',
  'Overlapping accept is rejected with a non-leaking, explanatory conflict message'
);

-- 4. Rounding: partial hours/days round up; exact boundaries don't
-- over-round.
select test.as_user('aa000000-0000-0000-0000-0000000000a1');
select test.assert(
  (public.compute_booking_quote(:'hourly_veh_id', '2026-10-01 08:00:00+00', '2026-10-01 10:30:00+00') ->> 'units')::int = 3,
  'Rounding: a 2.5 hour rental on an hourly-rate vehicle rounds up to 3 billed hours'
);
select test.assert(
  (public.compute_booking_quote(:'veh_id', '2026-10-01 00:00:00+00', '2026-10-02 00:00:00+00') ->> 'units')::int = 1,
  'Rounding: an exact 24 hour rental bills as exactly 1 day, not 2'
);
select test.assert(
  (public.compute_booking_quote(:'veh_id', '2026-10-01 00:00:00+00', '2026-10-02 01:00:00+00') ->> 'units')::int = 2,
  'Rounding: 25 hours rounds up to 2 billed days'
);

-- 5. Cancellations: a customer can cancel their own pending booking,
-- repeating the cancel is a safe no-op, and a cancelled booking can never
-- be accepted afterwards.
select test.as_user('aa000000-0000-0000-0000-0000000000a8');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'aa000000-0000-0000-0000-0000000000a8', 'requested', '2026-11-01 00:00:00+00', '2026-11-02 00:00:00+00')
returning id \gset cancel_

select test.assert(
  (public.cancel_booking(:'cancel_id', 'change of plans')).status = 'cancelled',
  'Customer can cancel their own requested booking'
);
select test.assert(
  (public.cancel_booking(:'cancel_id')).status = 'cancelled',
  'Cancelling an already-cancelled booking is an idempotent no-op, not an error'
);
select test.assert(
  (select count(*) from public.booking_events where booking_id = :'cancel_id' and event_type = 'status_change') = 1,
  'The idempotent repeat cancel did not write a second status_change event'
);
select test.assert_raises(
  format('select public.accept_booking(%L)', :'cancel_id'),
  'A cancelled booking can never be accepted'
);

-- 6. Idempotency on accept: retrying the same accept call is safe and
-- doesn't duplicate the audit trail or recompute a different price.
select test.as_user('aa000000-0000-0000-0000-0000000000a9');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'aa000000-0000-0000-0000-0000000000a9', 'requested', '2026-11-10 00:00:00+00', '2026-11-11 00:00:00+00')
returning id \gset idem_

select test.as_user('aa000000-0000-0000-0000-0000000000a1');
select test.assert(
  (public.accept_booking(:'idem_id')).total_amount_laari = 100000,
  'First accept computes the total from the vehicle''s current daily rate'
);
select test.assert(
  (public.accept_booking(:'idem_id')).total_amount_laari = 100000,
  'Retried accept returns the same total (idempotent, not recomputed)'
);
select test.assert(
  (select count(*) from public.booking_events where booking_id = :'idem_id' and event_type = 'status_change') = 1,
  'The retried accept did not write a second status_change event'
);
select test.assert(
  (select count(*) from public.booking_events where booking_id = :'idem_id' and event_type = 'created') = 1,
  'Booking creation itself was audited exactly once'
);

-- 7. A booking's dates can't be edited once accepted (closes the path
-- that would otherwise let a raw client UPDATE hit the exclusion
-- constraint and leak another customer's booking window via Postgres's
-- native error detail).
select test.assert_raises(
  format('update public.bookings set starts_at = %L where id = %L', '2026-11-12 00:00:00+00', :'idem_id'),
  'An accepted booking''s dates cannot be changed via a direct UPDATE'
);

select test.as_superuser();
\echo '05_booking_engine.sql: all assertions passed'
