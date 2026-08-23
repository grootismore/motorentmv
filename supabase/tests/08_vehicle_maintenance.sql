-- Proves: any org member can read the fleet's maintenance history (it's
-- operations data, not the financial ledger), but only owner/manager can
-- record or correct an entry, and it stays scoped to the vehicle's own
-- organization like every other tenant table.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('dd000000-0000-0000-0000-0000000000d1', 'owner-j@example.com'),
  ('dd000000-0000-0000-0000-0000000000d2', 'staff-j@example.com'),
  ('dd000000-0000-0000-0000-0000000000d3', 'outsider-j@example.com');

select test.as_user('dd000000-0000-0000-0000-0000000000d1');
insert into public.organizations (name, slug) values ('Org J', 'org-j-maintenance-test') returning id \gset org_
insert into public.vehicles (organization_id, registration_number, status, odometer_km)
values (:'org_id', 'J-001', 'available', 12000) returning id \gset veh_

insert into public.organization_members (organization_id, user_id, role, status)
values (:'org_id', 'dd000000-0000-0000-0000-0000000000d2', 'staff', 'active');

-- Owner records a service entry.
select test.as_user('dd000000-0000-0000-0000-0000000000d1');
insert into public.vehicle_maintenance_records
  (organization_id, vehicle_id, description, cost_laari, odometer_km_at_service, performed_on, recorded_by)
values (:'org_id', :'veh_id', 'Oil change and brake pads', 85000, 12000, current_date, 'dd000000-0000-0000-0000-0000000000d1')
returning id \gset rec_

-- Staff can see the fleet's maintenance history (operations data, not
-- financial-access-gated like expenses).
select test.as_user('dd000000-0000-0000-0000-0000000000d2');
select test.assert(
  (select count(*) from public.vehicle_maintenance_records where id = :'rec_id') = 1,
  'Staff can see a maintenance record recorded by the owner'
);

-- ...but staff cannot record one themselves.
select test.assert_raises(
  format(
    'insert into public.vehicle_maintenance_records (organization_id, vehicle_id, description, performed_on, recorded_by) values (%L, %L, %L, current_date, %L)',
    :'org_id', :'veh_id', 'Tyre replacement', 'dd000000-0000-0000-0000-0000000000d2'
  ),
  'Staff cannot record a maintenance entry (owner/manager only)'
);

-- ...nor update or delete the owner's entry. RLS filters these out of the
-- update/delete's row set rather than raising -- an UPDATE/DELETE that
-- matches zero rows succeeds with no error, so this proves the record is
-- unchanged instead of expecting an exception.
update public.vehicle_maintenance_records set description = 'tampered' where id = :'rec_id';
delete from public.vehicle_maintenance_records where id = :'rec_id';
select test.as_user('dd000000-0000-0000-0000-0000000000d1');
select test.assert(
  (select description from public.vehicle_maintenance_records where id = :'rec_id') = 'Oil change and brake pads',
  'Staff cannot update a maintenance record'
);
select test.assert(
  (select count(*) from public.vehicle_maintenance_records where id = :'rec_id') = 1,
  'Staff cannot delete a maintenance record'
);
-- An outsider (no membership in Org J at all) sees nothing.
select test.as_user('dd000000-0000-0000-0000-0000000000d3');
select test.assert(
  (select count(*) from public.vehicle_maintenance_records where id = :'rec_id') = 0,
  'A non-member cannot see Org J''s maintenance records'
);

select test.as_superuser();
\echo '08_vehicle_maintenance.sql: all assertions passed'
