-- Prompt 11 ("renter finance tracking"): proves booking_id is genuinely
-- optional on transactions -- but only for a standalone payment, only for
-- someone with financial access, and that recording one doesn't touch any
-- booking or its timeline.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('ff000000-0000-0000-0000-0000000000f1', 'owner-l@example.com'),
  ('ff000000-0000-0000-0000-0000000000f2', 'staff-l@example.com'),
  ('ff000000-0000-0000-0000-0000000000f3', 'customer-l@example.com');

select test.as_user('ff000000-0000-0000-0000-0000000000f1');
insert into public.organizations (name, slug) values ('Org L', 'org-l-finance-test') returning id \gset org_
insert into public.vehicles (organization_id, registration_number, status) values (:'org_id', 'L-001', 'available') returning id \gset veh_
insert into public.vehicle_rates (vehicle_id, rate_type, amount_laari) values (:'veh_id', 'daily', 100000);

insert into public.organization_members (organization_id, user_id, role, status)
values (:'org_id', 'ff000000-0000-0000-0000-0000000000f2', 'staff', 'active');

-- Staff cannot record standalone income (no booking to cross-check
-- against) -- the same financial-access bar as expenses.
select test.as_user('ff000000-0000-0000-0000-0000000000f2');
select test.assert_raises(
  format(
    'insert into public.transactions (organization_id, type, method, amount_laari, category, recorded_by) values (%L, %L, %L, %L, %L, %L)',
    :'org_id', 'payment', 'cash', 50000, 'Parts sale', 'ff000000-0000-0000-0000-0000000000f2'
  ),
  'Staff cannot record standalone income (financial access required)'
);

-- Owner can.
select test.as_user('ff000000-0000-0000-0000-0000000000f1');
insert into public.transactions (organization_id, type, method, amount_laari, category, recorded_by)
values (:'org_id', 'payment', 'cash', 50000, 'Parts sale', 'ff000000-0000-0000-0000-0000000000f1')
returning id \gset standalone_

select test.assert(
  (select booking_id from public.transactions where id = :'standalone_id') is null,
  'Standalone income has no booking_id'
);

-- A refund or adjustment always corrects a specific charge -- it cannot
-- be standalone even for an owner.
select test.assert_raises(
  format(
    'insert into public.transactions (organization_id, type, amount_laari, recorded_by) values (%L, %L, %L, %L)',
    :'org_id', 'refund', 10000, 'ff000000-0000-0000-0000-0000000000f1'
  ),
  'A refund cannot be standalone -- it must reference the booking it refunds'
);
select test.assert_raises(
  format(
    'insert into public.transactions (organization_id, type, amount_laari, recorded_by) values (%L, %L, %L, %L)',
    :'org_id', 'adjustment', 10000, 'ff000000-0000-0000-0000-0000000000f1'
  ),
  'An adjustment cannot be standalone -- it must reference the booking it adjusts'
);

-- Recording standalone income does not create a booking_events row (there
-- is no booking timeline for it to join) and does not touch any
-- booking's payment_status.
select test.assert(
  (select count(*) from public.booking_events where metadata ->> 'transaction_id' = :'standalone_id') = 0,
  'Standalone income is not logged to any booking timeline'
);

-- A booking-linked payment still works exactly as before, recorded by
-- staff (no financial-access requirement when a real booking backs it).
select test.as_user('ff000000-0000-0000-0000-0000000000f3');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'ff000000-0000-0000-0000-0000000000f3', 'requested', now() + interval '1 day', now() + interval '2 day')
returning id \gset bk_

select test.as_user('ff000000-0000-0000-0000-0000000000f1');
select test.assert(
  (public.accept_booking(:'bk_id')).status = 'accepted',
  'Owner accepts the booking'
);

select test.as_user('ff000000-0000-0000-0000-0000000000f2');
insert into public.transactions (booking_id, organization_id, type, method, amount_laari, recorded_by)
values (:'bk_id', :'org_id', 'payment', 'cash', 100000, 'ff000000-0000-0000-0000-0000000000f2')
returning id \gset booking_txn_

select test.assert(
  (select payment_status from public.bookings where id = :'bk_id') = 'paid',
  'A booking-linked payment still recomputes payment_status as before'
);
select test.assert(
  exists (select 1 from public.booking_events where metadata ->> 'transaction_id' = :'booking_txn_id'),
  'A booking-linked payment is still logged to the booking timeline'
);

select test.as_superuser();
\echo '10_standalone_income.sql: all assertions passed'
