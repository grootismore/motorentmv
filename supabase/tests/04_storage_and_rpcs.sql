-- Proves: vehicle-photo storage policies scope by vehicle
-- availability/org-membership (not a trusted path segment), and the two
-- Prompt-3 RPCs (invite_org_member_by_email, set_vehicle_rate) enforce
-- the same authorization rules their tables' own RLS would if these
-- weren't SECURITY DEFINER.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('80000000-0000-0000-0000-000000000001', 'owner-h@example.com'),
  ('80000000-0000-0000-0000-000000000002', 'staff-h@example.com'),
  ('80000000-0000-0000-0000-000000000003', 'outsider-h@example.com');

select test.as_user('80000000-0000-0000-0000-000000000001');
insert into public.organizations (name, slug) values ('Org H', 'org-h-storage-test') returning id \gset org_
insert into public.organization_members (organization_id, user_id, role, status)
values (:'org_id', '80000000-0000-0000-0000-000000000002', 'staff', 'active');

insert into public.vehicles (organization_id, registration_number, status) values (:'org_id', 'H-001', 'draft') returning id \gset veh_

-- Owner uploads a photo for their own (not-yet-available) vehicle.
insert into storage.objects (bucket_id, name, owner) values ('vehicle-photos', :'veh_id' || '/front.jpg', '80000000-0000-0000-0000-000000000001');

-- Staff (org member, not owner/manager) can still SEE it...
select test.as_user('80000000-0000-0000-0000-000000000002');
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'vehicle-photos' and name = :'veh_id' || '/front.jpg') = 1,
  'An org member can see a draft vehicle''s photo'
);
-- ...but cannot upload one (insert requires owner/manager).
select test.assert_raises(
  format('insert into storage.objects (bucket_id, name, owner) values (%L, %L, %L)',
    'vehicle-photos', :'veh_id' || '/staff-upload.jpg', '80000000-0000-0000-0000-000000000002'),
  'Staff cannot upload a vehicle photo (owner/manager only)'
);

-- An outsider (no relationship to the org, vehicle is draft not
-- available) cannot see the photo at all.
select test.as_user('80000000-0000-0000-0000-000000000003');
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'vehicle-photos' and name = :'veh_id' || '/front.jpg') = 0,
  'An outsider cannot see a draft (non-public) vehicle''s photo'
);

-- Once the vehicle is available, anyone authenticated can see its photos
-- (discovery), still without being able to upload/delete.
select test.as_superuser();
update public.vehicles set status = 'available' where id = :'veh_id';
select test.as_user('80000000-0000-0000-0000-000000000003');
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'vehicle-photos' and name = :'veh_id' || '/front.jpg') = 1,
  'Anyone authenticated can see an available vehicle''s photo'
);
-- A DELETE whose USING clause excludes every row succeeds silently as
-- "DELETE 0" — it does not raise. The real assertion is that the row
-- still exists afterward, not that an error was thrown (same class of
-- thing proven in tests/01 and tests/02 for UPDATE).
delete from storage.objects where bucket_id = 'vehicle-photos' and name = :'veh_id' || '/front.jpg';
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'vehicle-photos' and name = :'veh_id' || '/front.jpg') = 1,
  'An outsider''s delete attempt silently affected zero rows — the photo still exists'
);

-- documents row DELETE (the metadata half of "remove a vehicle photo",
-- alongside the storage.objects delete already proven above).
select test.as_superuser();
insert into public.documents (vehicle_id, document_type, storage_path, uploaded_by)
values (:'veh_id', 'vehicle_photo', :'veh_id' || '/front.jpg', '80000000-0000-0000-0000-000000000001')
returning id \gset doc_

select test.as_user('80000000-0000-0000-0000-000000000003');
delete from public.documents where id = :'doc_id';
-- Checked as superuser, not as the outsider: the outsider's own SELECT
-- policy would also hide this row, so counting "as them" would read 0
-- regardless of whether the delete actually happened — the same
-- zero-visibility trap as checking a write with the writer's own read.
select test.as_superuser();
select test.assert(
  (select count(*) from public.documents where id = :'doc_id') = 1,
  'An outsider''s delete attempt silently affected zero rows — the document row still exists'
);

select test.as_user('80000000-0000-0000-0000-000000000001');
delete from public.documents where id = :'doc_id';
select test.assert(
  (select count(*) from public.documents where id = :'doc_id') = 0,
  'The org owner can delete a vehicle photo''s document row'
);

-- invite_org_member_by_email ------------------------------------------

select test.as_user('80000000-0000-0000-0000-000000000001');

-- Inviting an email with no account is a clear, distinguishable error.
select test.assert_raises(
  format('select public.invite_org_member_by_email(%L, %L, %L)', :'org_id', 'nobody@example.com', 'staff'),
  'Inviting an unregistered email fails clearly'
);

select test.as_superuser();
insert into auth.users (id, email) values ('80000000-0000-0000-0000-000000000004', 'new-staff-h@example.com');
select test.as_user('80000000-0000-0000-0000-000000000001');
select test.assert(
  (public.invite_org_member_by_email(:'org_id', 'new-staff-h@example.com', 'staff')).status = 'invited',
  'Owner can invite an existing account as staff'
);

-- Staff cannot invite anyone (same rule as direct organization_members INSERT).
select test.as_user('80000000-0000-0000-0000-000000000002');
select test.assert_raises(
  format('select public.invite_org_member_by_email(%L, %L, %L)', :'org_id', 'outsider-h@example.com', 'staff'),
  'Staff cannot invite via the RPC either'
);

-- set_vehicle_rate -------------------------------------------------------

select test.as_user('80000000-0000-0000-0000-000000000001');
select test.assert(
  (public.set_vehicle_rate(:'veh_id', 'daily', 30000)).amount_laari = 30000,
  'Owner can set a vehicle''s daily rate'
);
select test.assert(
  (public.set_vehicle_rate(:'veh_id', 'daily', 35000)).amount_laari = 35000,
  'Owner can revise the daily rate (closes the old window, opens a new one)'
);
select test.assert(
  (select count(*) from public.vehicle_rates where vehicle_id = :'veh_id' and rate_type = 'daily' and effective_to is null) = 1,
  'Exactly one open-ended daily rate remains after the revision'
);

-- Staff cannot change rates.
select test.as_user('80000000-0000-0000-0000-000000000002');
select test.assert_raises(
  format('select public.set_vehicle_rate(%L, %L, %L)', :'veh_id', 'hourly', 5000),
  'Staff cannot set vehicle rates (owner/manager only)'
);

select test.as_superuser();
\echo '04_storage_and_rpcs.sql: all assertions passed'
