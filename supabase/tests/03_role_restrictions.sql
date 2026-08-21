-- Proves: owner/manager get full financial visibility (PRD §6.6:
-- "Owners see all financial data"); staff get none by default beyond
-- entries they personally recorded ("staff permissions must be
-- explicit"); and only an owner may grant owner/manager roles — a
-- manager can invite staff but can't promote anyone, including
-- themselves, to manager or owner.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'owner-g@example.com'),
  ('20000000-0000-0000-0000-000000000002', 'manager-g@example.com'),
  ('30000000-0000-0000-0000-000000000003', 'staff-g@example.com'),
  ('40000000-0000-0000-0000-000000000004', 'customer-g@example.com'),
  -- Pre-created so the privilege-escalation attempts below fail on the
  -- RLS check they're actually testing, not incidentally on a foreign
  -- key violation because the target user doesn't exist yet.
  ('60000000-0000-0000-0000-000000000006', 'rando1-g@example.com'),
  ('70000000-0000-0000-0000-000000000007', 'rando2-g@example.com');

select test.as_user('10000000-0000-0000-0000-000000000001');
insert into public.organizations (name, slug) values ('Org G', 'org-g-role-test') returning id \gset org_
insert into public.vehicles (organization_id, registration_number, status) values (:'org_id', 'G-001', 'available') returning id \gset veh_

insert into public.organization_members (organization_id, user_id, role, status)
values (:'org_id', '20000000-0000-0000-0000-000000000002', 'manager', 'active');
insert into public.organization_members (organization_id, user_id, role, status)
values (:'org_id', '30000000-0000-0000-0000-000000000003', 'staff', 'active');

select test.as_user('40000000-0000-0000-0000-000000000004');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', '40000000-0000-0000-0000-000000000004', 'requested', now() + interval '7 day', now() + interval '8 day')
returning id \gset bk_

select test.as_user('10000000-0000-0000-0000-000000000001');
select (public.transition_booking_status(:'bk_id', 'accepted', '{"total_laari": 100000}'::jsonb, '{}'::jsonb, 100000)).status;

-- Staff records a payment (a normal front-desk task) and an expense
-- (which staff should NOT be able to do — expenses have no
-- "recorded_by sees their own" carve-out).
select test.as_user('30000000-0000-0000-0000-000000000003');
insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by)
values (:'bk_id', :'org_id', 'payment', 'cash', 100000, '30000000-0000-0000-0000-000000000003')
returning id \gset staff_txn_

select test.assert_raises(
  format('insert into public.expenses (organization_id, category, amount_laari, occurred_on, recorded_by) values (%L, %L, %L, current_date, %L)',
    :'org_id', 'fuel', 5000, '30000000-0000-0000-0000-000000000003'),
  'Staff cannot record an expense (financial data requires owner/manager)'
);

select test.assert(
  (select count(*) from public.transactions where id = :'staff_txn_id') = 1,
  'Staff can see the transaction they personally recorded'
);

-- Owner records an expense; staff must not see it.
select test.as_user('10000000-0000-0000-0000-000000000001');
insert into public.expenses (organization_id, category, amount_laari, occurred_on, recorded_by)
values (:'org_id', 'fuel', 5000, current_date, '10000000-0000-0000-0000-000000000001')
returning id \gset owner_expense_

select test.as_user('30000000-0000-0000-0000-000000000003');
select test.assert(
  (select count(*) from public.expenses where id = :'owner_expense_id') = 0,
  'Staff cannot see an expense recorded by the owner'
);

-- Manager CAN see it (owner/manager both have financial access).
select test.as_user('20000000-0000-0000-0000-000000000002');
select test.assert(
  (select count(*) from public.expenses where id = :'owner_expense_id') = 1,
  'Manager can see the org''s expenses'
);

-- Manager can invite a new staff member...
select test.as_superuser();
insert into auth.users (id, email) values ('50000000-0000-0000-0000-000000000005', 'staff2-g@example.com');
select test.as_user('20000000-0000-0000-0000-000000000002');
insert into public.organization_members (organization_id, user_id, role, status)
values (:'org_id', '50000000-0000-0000-0000-000000000005', 'staff', 'active');

-- ...but cannot promote anyone (including themselves) to manager or owner.
select test.assert_raises(
  format('update public.organization_members set role = %L where organization_id = %L and user_id = %L', 'owner', :'org_id', '20000000-0000-0000-0000-000000000002'),
  'A manager cannot self-promote to owner'
);
select test.assert_raises(
  format('insert into public.organization_members (organization_id, user_id, role, status) values (%L, %L, %L, %L)',
    :'org_id', '60000000-0000-0000-0000-000000000006', 'manager', 'active'),
  'A manager cannot grant the manager role to a new member'
);

-- Staff cannot manage membership at all, not even inviting more staff.
select test.as_user('30000000-0000-0000-0000-000000000003');
select test.assert_raises(
  format('insert into public.organization_members (organization_id, user_id, role, status) values (%L, %L, %L, %L)',
    :'org_id', '70000000-0000-0000-0000-000000000007', 'staff', 'active'),
  'Staff cannot invite other members (owner/manager only)'
);

select test.as_superuser();
\echo '03_role_restrictions.sql: all assertions passed'
