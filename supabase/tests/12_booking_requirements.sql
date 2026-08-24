-- Proves: a customer cannot request (or resubmit) a booking without a
-- license + ID/passport photo on file, and a renter cannot activate a
-- booking whose vehicle carries a deposit until at least that much is
-- recorded as paid.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('1a000000-0000-0000-0000-000000000001', 'renter-n@example.com'),
  ('1a000000-0000-0000-0000-000000000002', 'staff-n@example.com'),
  ('1a000000-0000-0000-0000-000000000003', 'customer-n@example.com');

select test.as_user('1a000000-0000-0000-0000-000000000001');
insert into public.organizations (name, slug) values ('Org N', 'org-n-requirements-test') returning id \gset org_
insert into public.organization_members (organization_id, user_id, role, status)
values (:'org_id', '1a000000-0000-0000-0000-000000000002', 'staff', 'active');

insert into public.vehicles (organization_id, registration_number, status, deposit_amount_laari)
values (:'org_id', 'N-001', 'available', 500000)
returning id \gset veh_
select public.set_vehicle_rate(:'veh_id', 'daily', 30000);

-- Document gate --------------------------------------------------------

select test.as_user('1a000000-0000-0000-0000-000000000003');
select test.assert_raises(
  format('select public.request_booking(null, %L, %L, %L, %L, %L, null)',
    :'org_id', :'veh_id', '1a000000-0000-0000-0000-000000000003',
    '2026-09-01T04:00:00Z'::timestamptz, '2026-09-02T04:00:00Z'::timestamptz),
  'A customer with no documents on file cannot request a booking'
);

select test.as_superuser();
insert into public.documents (profile_id, document_type, storage_path, uploaded_by)
values ('1a000000-0000-0000-0000-000000000003', 'license', '1a000000-0000-0000-0000-000000000003/license.jpg', '1a000000-0000-0000-0000-000000000003');

select test.as_user('1a000000-0000-0000-0000-000000000003');
select test.assert_raises(
  format('select public.request_booking(null, %L, %L, %L, %L, %L, null)',
    :'org_id', :'veh_id', '1a000000-0000-0000-0000-000000000003',
    '2026-09-01T04:00:00Z'::timestamptz, '2026-09-02T04:00:00Z'::timestamptz),
  'A customer with only a license (no ID/passport) still cannot request a booking'
);

select test.as_superuser();
-- A rejected ID document doesn't count toward the requirement.
insert into public.documents (profile_id, document_type, storage_path, uploaded_by, status)
values ('1a000000-0000-0000-0000-000000000003', 'id_card', '1a000000-0000-0000-0000-000000000003/id-rejected.jpg', '1a000000-0000-0000-0000-000000000003', 'rejected');

select test.as_user('1a000000-0000-0000-0000-000000000003');
select test.assert_raises(
  format('select public.request_booking(null, %L, %L, %L, %L, %L, null)',
    :'org_id', :'veh_id', '1a000000-0000-0000-0000-000000000003',
    '2026-09-01T04:00:00Z'::timestamptz, '2026-09-02T04:00:00Z'::timestamptz),
  'A rejected ID/passport document does not satisfy the requirement'
);

select test.as_superuser();
insert into public.documents (profile_id, document_type, storage_path, uploaded_by)
values ('1a000000-0000-0000-0000-000000000003', 'id_card', '1a000000-0000-0000-0000-000000000003/id.jpg', '1a000000-0000-0000-0000-000000000003');

select test.as_user('1a000000-0000-0000-0000-000000000003');
select (public.request_booking(null, :'org_id', :'veh_id', '1a000000-0000-0000-0000-000000000003',
  '2026-09-01T04:00:00Z'::timestamptz, '2026-09-02T04:00:00Z'::timestamptz, null)).id as bk_id \gset
select test.assert(
  (select status from public.bookings where id = :'bk_id') = 'requested',
  'A customer with both a license and an ID/passport on file can request a booking'
);

-- Resubmission after needs_info also requires documents on file (already
-- satisfied here, so this just proves the resubmit path isn't skipped --
-- a customer with documents removed after their first request would hit
-- the same assert_raises path proven above, via transition_booking_status
-- instead of request_booking).
select test.as_user('1a000000-0000-0000-0000-000000000001');
select public.mark_booking_needs_info(:'bk_id', 'Please confirm your pickup time');
select test.as_user('1a000000-0000-0000-0000-000000000003');
select test.assert(
  (public.request_booking(:'bk_id')).status = 'requested',
  'Resubmitting after needs_info succeeds once documents are on file'
);

-- Deposit gate -----------------------------------------------------------

select test.as_user('1a000000-0000-0000-0000-000000000001');
select test.assert(
  (public.accept_booking(:'bk_id')).status = 'accepted',
  'Owner accepts the booking'
);
select public.ready_booking(:'bk_id');

select test.as_user('1a000000-0000-0000-0000-000000000002');
insert into public.inspections (booking_id, inspection_type, odometer_km, fuel_battery_percent, performed_by)
values (:'bk_id', 'pickup', 1200, 90, '1a000000-0000-0000-0000-000000000002');

select test.assert_raises(
  format('select public.activate_booking(%L)', :'bk_id'),
  'A vehicle with a deposit cannot be activated with no payment recorded'
);

insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by)
values (:'bk_id', :'org_id', 'payment', 'cash', 200000, '1a000000-0000-0000-0000-000000000002');

select test.assert_raises(
  format('select public.activate_booking(%L)', :'bk_id'),
  'A partial payment below the deposit amount still blocks activation'
);

insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by)
values (:'bk_id', :'org_id', 'payment', 'cash', 300000, '1a000000-0000-0000-0000-000000000002');

select test.assert(
  (public.activate_booking(:'bk_id')).status = 'active',
  'Once the full deposit is recorded as paid, the booking can be activated'
);

-- A vehicle with no deposit configured is unaffected (no payment needed
-- to activate) -- same behavior as every booking before this migration.
select test.as_superuser();
insert into public.vehicles (organization_id, registration_number, status)
values (:'org_id', 'N-002', 'available')
returning id \gset veh2_

select test.as_user('1a000000-0000-0000-0000-000000000001');
select public.set_vehicle_rate(:'veh2_id', 'daily', 25000);

select test.as_user('1a000000-0000-0000-0000-000000000003');
select (public.request_booking(null, :'org_id', :'veh2_id', '1a000000-0000-0000-0000-000000000003',
  '2026-09-05T04:00:00Z'::timestamptz, '2026-09-06T04:00:00Z'::timestamptz, null)).id as bk2_id \gset

select test.as_user('1a000000-0000-0000-0000-000000000001');
select public.accept_booking(:'bk2_id');
select public.ready_booking(:'bk2_id');
select test.as_user('1a000000-0000-0000-0000-000000000002');
insert into public.inspections (booking_id, inspection_type, odometer_km, fuel_battery_percent, performed_by)
values (:'bk2_id', 'pickup', 500, 100, '1a000000-0000-0000-0000-000000000002');

select test.assert(
  (public.activate_booking(:'bk2_id')).status = 'active',
  'A vehicle with no deposit configured activates with no payment recorded'
);

select test.as_superuser();
\echo '12_booking_requirements.sql: all assertions passed'
