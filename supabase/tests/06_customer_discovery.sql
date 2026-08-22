-- Prompt 5: customer discovery — search only returns bookable vehicles
-- for the exact requested UTC interval, filters work, listing/quote
-- RPCs are scoped to available vehicles only, and anonymous (anon role)
-- access is exactly as narrow as intended: the four discovery RPCs plus
-- vehicle photos of available vehicles, nothing else.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('bb000000-0000-0000-0000-0000000000b1', 'owner-i@example.com'),
  ('bb000000-0000-0000-0000-0000000000b2', 'customer-i2@example.com');

select test.as_user('bb000000-0000-0000-0000-0000000000b1');
insert into public.organizations (name, slug, default_location) values ('Org I', 'org-i-discovery-test', 'Male')
  returning id \gset org_

-- V1: available, scooter/automatic, Male, daily 100000 -- the plain
-- "should appear" case.
insert into public.vehicles (organization_id, registration_number, category, transmission, location, status)
values (:'org_id', 'I-001', 'scooter', 'automatic', 'Male', 'available')
returning id \gset v1_
insert into public.vehicle_rates (vehicle_id, rate_type, amount_laari) values (:'v1_id', 'daily', 100000);

-- V2: available, scooter/manual, Hulhumale, daily 50000 -- differs on
-- every filterable dimension from V1.
insert into public.vehicles (organization_id, registration_number, category, transmission, location, status)
values (:'org_id', 'I-002', 'scooter', 'manual', 'Hulhumale', 'available')
returning id \gset v2_
insert into public.vehicle_rates (vehicle_id, rate_type, amount_laari) values (:'v2_id', 'daily', 50000);

-- V3: draft (never available) -- must never appear in search, listing or
-- quote regardless of dates.
insert into public.vehicles (organization_id, registration_number, category, transmission, location, status)
values (:'org_id', 'I-003', 'scooter', 'automatic', 'Male', 'draft')
returning id \gset v3_

-- V4: available, but has a confirmed (accepted) booking overlapping the
-- test search window -- must be excluded from that window only.
insert into public.vehicles (organization_id, registration_number, category, transmission, location, status)
values (:'org_id', 'I-004', 'scooter', 'automatic', 'Male', 'available')
returning id \gset v4_
insert into public.vehicle_rates (vehicle_id, rate_type, amount_laari) values (:'v4_id', 'daily', 60000);

select test.as_user('bb000000-0000-0000-0000-0000000000b2');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'v4_id', 'bb000000-0000-0000-0000-0000000000b2', 'requested', '2027-01-10 00:00:00+00', '2027-01-12 00:00:00+00')
returning id \gset v4_bk_

select test.as_user('bb000000-0000-0000-0000-0000000000b1');
select test.assert(
  (public.accept_booking(:'v4_bk_id')).status = 'accepted',
  'Setup: V4''s booking is accepted (now a confirmed, blocking booking)'
);

-- V5: available, but has a manual availability_block overlapping the
-- test window -- must be excluded the same way V4 is, via a different
-- mechanism.
insert into public.vehicles (organization_id, registration_number, category, transmission, location, status)
values (:'org_id', 'I-005', 'scooter', 'automatic', 'Male', 'available')
returning id \gset v5_
insert into public.availability_blocks (vehicle_id, starts_at, ends_at, reason)
values (:'v5_id', '2027-01-10 00:00:00+00', '2027-01-12 00:00:00+00', 'Scheduled service');

-- 1. Anonymous search over the shared test window: V1 and V2 (both
-- available, both free) must appear; V3 (draft), V4 (booked) and V5
-- (blocked) must not.
select test.as_anon();
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-10 00:00:00+00', '2027-01-12 00:00:00+00') r where r.vehicle_id = :'v1_id') = 1,
  'Anonymous search finds V1 (available, unbooked)'
);
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-10 00:00:00+00', '2027-01-12 00:00:00+00') r where r.vehicle_id = :'v2_id') = 1,
  'Anonymous search finds V2 (available, unbooked)'
);
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-10 00:00:00+00', '2027-01-12 00:00:00+00') r where r.vehicle_id = :'v3_id') = 0,
  'Search never returns a draft vehicle'
);
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-10 00:00:00+00', '2027-01-12 00:00:00+00') r where r.vehicle_id = :'v4_id') = 0,
  'Search excludes a vehicle with a confirmed overlapping booking'
);
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-10 00:00:00+00', '2027-01-12 00:00:00+00') r where r.vehicle_id = :'v5_id') = 0,
  'Search excludes a vehicle with an overlapping availability block'
);

-- 2. UTC interval correctness: a range that does not overlap V4's
-- booking (entirely before it) must include V4 again -- proves the
-- exclusion is genuinely date-scoped, not "ever booked".
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-01 00:00:00+00', '2027-01-02 00:00:00+00') r where r.vehicle_id = :'v4_id') = 1,
  'A search window before V4''s booking includes V4 again'
);
-- Same instant, expressed with a +05:00 offset, must be recognized as
-- the identical UTC range as above (no false inclusion of V4).
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-10 05:00:00+05', '2027-01-12 05:00:00+05') r where r.vehicle_id = :'v4_id') = 0,
  'A +05:00-expressed window identical to the booked UTC range still excludes V4'
);

-- 3. Filters.
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-01 00:00:00+00', '2027-01-02 00:00:00+00', p_transmission => 'manual')) = 1,
  'Transmission filter narrows to V2 only'
);
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-01 00:00:00+00', '2027-01-02 00:00:00+00', p_location => 'Hulhumale') r where r.vehicle_id = :'v2_id') = 1,
  'Location filter (partial, case-insensitive) matches V2 in Hulhumale'
);
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-01 00:00:00+00', '2027-01-02 00:00:00+00', p_location => 'Hulhumale') r where r.vehicle_id = :'v1_id') = 0,
  'Location filter excludes V1 (Male) when searching Hulhumale'
);
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-01 00:00:00+00', '2027-01-02 00:00:00+00', p_max_daily_rate_laari => 60000) r where r.vehicle_id = :'v1_id') = 0,
  'Max daily rate filter excludes V1 (100000 laari/day) when the cap is 60000'
);
select test.assert(
  (select count(*) from public.search_available_vehicles('2027-01-01 00:00:00+00', '2027-01-02 00:00:00+00', p_max_daily_rate_laari => 60000) r where r.vehicle_id = :'v2_id') = 1,
  'Max daily rate filter keeps V2 (50000 laari/day) when the cap is 60000'
);

select test.assert_raises(
  'select * from public.search_available_vehicles(''2027-01-02 00:00:00+00'', ''2027-01-01 00:00:00+00'')',
  'search_available_vehicles rejects ends_at before starts_at'
);

-- 4. get_vehicle_listing: available vehicles are visible to anon; a
-- draft vehicle returns no row at all (not an error, not partial data).
select test.assert(
  (select count(*) from public.get_vehicle_listing(:'v1_id')) = 1,
  'Anonymous get_vehicle_listing returns V1'
);
select test.assert(
  (select count(*) from public.get_vehicle_listing(:'v3_id')) = 0,
  'Anonymous get_vehicle_listing returns nothing for a draft vehicle'
);

-- 5. get_listing_quote (anon) matches compute_booking_quote's own
-- numbers (authenticated org member) for the same vehicle/range, and
-- refuses an unavailable vehicle outright. compute_booking_quote itself
-- is authenticated-only (Prompt 4), so its side of the comparison has to
-- run as the org owner, not anon -- captured first, then compared once
-- back on the anon connection.
select test.as_user('bb000000-0000-0000-0000-0000000000b1');
select (public.compute_booking_quote(:'v1_id', '2027-02-01 00:00:00+00', '2027-02-02 00:00:00+00') ->> 'total_laari')::int
  as owner_computed_total \gset

select test.as_anon();
select test.assert(
  (public.get_listing_quote(:'v1_id', '2027-02-01 00:00:00+00', '2027-02-02 00:00:00+00') ->> 'total_laari')::int
    = :'owner_computed_total'::int,
  'get_listing_quote (anon) matches compute_booking_quote''s own numbers for the same vehicle and range'
);
select test.assert_raises(
  format('select public.get_listing_quote(%L, %L, %L)', :'v3_id', '2027-02-01 00:00:00+00', '2027-02-02 00:00:00+00'),
  'get_listing_quote refuses a draft (non-available) vehicle'
);

-- 6. is_vehicle_bookable: true for a free vehicle/range, false once
-- booked or blocked, false for a vehicle that was never available.
select test.assert(
  public.is_vehicle_bookable(:'v1_id', '2027-03-01 00:00:00+00', '2027-03-02 00:00:00+00') = true,
  'is_vehicle_bookable is true for an available, unbooked vehicle/range'
);
select test.assert(
  public.is_vehicle_bookable(:'v4_id', '2027-01-10 00:00:00+00', '2027-01-12 00:00:00+00') = false,
  'is_vehicle_bookable is false once the range overlaps a confirmed booking'
);
select test.assert(
  public.is_vehicle_bookable(:'v5_id', '2027-01-10 00:00:00+00', '2027-01-12 00:00:00+00') = false,
  'is_vehicle_bookable is false once the range overlaps an availability block'
);
select test.assert(
  public.is_vehicle_bookable(:'v3_id', '2027-03-01 00:00:00+00', '2027-03-02 00:00:00+00') = false,
  'is_vehicle_bookable is false for a draft (never-available) vehicle'
);

-- 7. Vehicle photos: anon can read a document row + storage object for
-- an available vehicle's photo, but not for a draft vehicle's, and not
-- any other document_type.
select test.as_superuser();
insert into public.documents (vehicle_id, document_type, storage_path, uploaded_by)
values (:'v1_id', 'vehicle_photo', :'v1_id' || '/photo1.jpg', 'bb000000-0000-0000-0000-0000000000b1')
returning id \gset v1_photo_
insert into public.documents (vehicle_id, document_type, storage_path, uploaded_by)
values (:'v3_id', 'vehicle_photo', :'v3_id' || '/photo1.jpg', 'bb000000-0000-0000-0000-0000000000b1')
returning id \gset v3_photo_
insert into storage.objects (bucket_id, name) values ('vehicle-photos', :'v1_id' || '/photo1.jpg');
insert into storage.objects (bucket_id, name) values ('vehicle-photos', :'v3_id' || '/photo1.jpg');
insert into public.documents (profile_id, document_type, storage_path, uploaded_by)
values ('bb000000-0000-0000-0000-0000000000b2', 'license', 'licenses/b2.jpg', 'bb000000-0000-0000-0000-0000000000b2')
returning id \gset license_

select test.as_anon();
select test.assert(
  (select count(*) from public.documents where id = :'v1_photo_id') = 1,
  'Anon can read a vehicle_photo document row for an available vehicle'
);
select test.assert(
  (select count(*) from public.documents where id = :'v3_photo_id') = 0,
  'Anon cannot read a vehicle_photo document row for a draft vehicle'
);
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'vehicle-photos' and name = :'v1_id' || '/photo1.jpg') = 1,
  'Anon can read the storage object for an available vehicle''s photo'
);
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'vehicle-photos' and name = :'v3_id' || '/photo1.jpg') = 0,
  'Anon cannot read the storage object for a draft vehicle''s photo'
);
select test.assert(
  (select count(*) from public.documents where id = :'license_id') = 0,
  'Anon''s widened document access is scoped to vehicle_photo only -- a license document stays invisible'
);

-- 8. Anon has no access to anything else this migration didn't
-- explicitly grant -- vehicles/vehicle_rates/organizations tables stay
-- authenticated-only (no table-level GRANT to anon at all, so the read
-- fails closed with a permission error rather than an empty result);
-- discovery goes through the RPCs, never direct table reads.
select test.assert_raises(
  'select count(*) from public.vehicles',
  'Anon cannot read public.vehicles directly (search_available_vehicles is the only path)'
);
select test.assert_raises(
  'select count(*) from public.organizations',
  'Anon cannot read public.organizations directly'
);

select test.as_superuser();
\echo '06_customer_discovery.sql: all assertions passed'
