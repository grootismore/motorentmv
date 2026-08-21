-- Proves: an org member of Org A cannot read or write Org B's data,
-- even when they know Org B's id (the whole point of keying every policy
-- off is_org_member() rather than a client-supplied id).
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'owner-a@example.com'),
  ('b0000000-0000-0000-0000-00000000000b', 'owner-b@example.com');

select test.as_user('a0000000-0000-0000-0000-00000000000a');
insert into public.organizations (name, slug) values ('Org A', 'org-a-tenant-test') returning id \gset org_a_
insert into public.vehicles (organization_id, registration_number, status) values (:'org_a_id', 'A-001', 'available') returning id \gset veh_a_

select test.as_user('b0000000-0000-0000-0000-00000000000b');
insert into public.organizations (name, slug) values ('Org B', 'org-b-tenant-test') returning id \gset org_b_
-- Deliberately not 'available' so we're testing the org-scoped policy,
-- not the "browse available vehicles" discovery policy which would let
-- anyone see this row regardless of tenant.
insert into public.vehicles (organization_id, registration_number, status) values (:'org_b_id', 'B-001', 'maintenance') returning id \gset veh_b_

-- Back to Org A's owner.
select test.as_user('a0000000-0000-0000-0000-00000000000a');

select test.assert(
  (select count(*) from public.organizations where id = :'org_b_id') = 0,
  'Org A owner cannot see Org B''s organization row'
);

select test.assert(
  (select count(*) from public.vehicles where id = :'veh_b_id') = 0,
  'Org A owner cannot see Org B''s (non-public) vehicle row'
);

select test.assert(
  (select count(*) from public.vehicles where organization_id = :'org_b_id') = 0,
  'Org A owner querying by Org B''s organization_id sees zero rows (RLS, not the client-supplied id, decides visibility)'
);

select test.assert_raises(
  format('insert into public.vehicles (organization_id, registration_number) values (%L, %L)', :'org_b_id', 'HACK-001'),
  'Org A owner cannot insert a vehicle into Org B'
);

-- An UPDATE whose USING clause matches zero rows succeeds silently as
-- "UPDATE 0" — it does not raise. So the real assertion is "the row is
-- untouched", not "an error was thrown".
update public.organizations set name = 'Pwned' where id = :'org_b_id';
select test.as_user('b0000000-0000-0000-0000-00000000000b');
select test.assert(
  (select name from public.organizations where id = :'org_b_id') = 'Org B',
  'Org A owner''s update against Org B''s organization silently affected zero rows'
);
select test.as_user('a0000000-0000-0000-0000-00000000000a');

-- A booking created against Org B must never be visible to Org A.
select test.as_superuser();
insert into auth.users (id, email) values ('c0000000-0000-0000-0000-00000000000c', 'shared-customer@example.com');
select test.as_user('c0000000-0000-0000-0000-00000000000c');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_b_id', :'veh_b_id', 'c0000000-0000-0000-0000-00000000000c', 'requested', now() + interval '3 day', now() + interval '4 day')
returning id \gset bk_b_

select test.as_user('a0000000-0000-0000-0000-00000000000a');
select test.assert(
  (select count(*) from public.bookings where id = :'bk_b_id') = 0,
  'Org A owner cannot see a booking that belongs to Org B'
);

select test.as_superuser();
\echo '01_tenant_isolation.sql: all assertions passed'
