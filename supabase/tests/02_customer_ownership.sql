-- Proves: a customer can only see/act on their own bookings, never
-- another customer's — even within the same organization.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('d0000000-0000-0000-0000-00000000000d', 'owner-d@example.com'),
  ('e0000000-0000-0000-0000-00000000000e', 'customer-e@example.com'),
  ('f0000000-0000-0000-0000-00000000000f', 'customer-f@example.com');

select test.as_user('d0000000-0000-0000-0000-00000000000d');
insert into public.organizations (name, slug) values ('Org D', 'org-d-ownership-test') returning id \gset org_
insert into public.vehicles (organization_id, registration_number, status) values (:'org_id', 'D-001', 'available') returning id \gset veh_

select test.as_user('e0000000-0000-0000-0000-00000000000e');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'e0000000-0000-0000-0000-00000000000e', 'requested', now() + interval '5 day', now() + interval '6 day')
returning id \gset bk_e_

select test.as_user('f0000000-0000-0000-0000-00000000000f');
insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
values (:'org_id', :'veh_id', 'f0000000-0000-0000-0000-00000000000f', 'requested', now() + interval '10 day', now() + interval '11 day')
returning id \gset bk_f_

-- Customer F must not see Customer E's booking.
select test.assert(
  (select count(*) from public.bookings where id = :'bk_e_id') = 0,
  'Customer F cannot see Customer E''s booking'
);

-- Customer F cannot edit Customer E's booking. RLS's USING clause simply
-- excludes rows Customer F isn't party to, so this UPDATE matches zero
-- rows and succeeds silently ("UPDATE 0") rather than raising — the real
-- assertion is that the row is untouched, not that an error was thrown.
update public.bookings set notes = 'meddling' where id = :'bk_e_id';
select test.as_user('e0000000-0000-0000-0000-00000000000e');
select test.assert(
  (select notes from public.bookings where id = :'bk_e_id') is distinct from 'meddling',
  'Customer F''s update against Customer E''s booking silently affected zero rows'
);
select test.as_user('f0000000-0000-0000-0000-00000000000f');

-- Customer F cannot cancel Customer E's booking via the RPC either — the
-- RPC does its own authorization check independent of RLS (it's SECURITY
-- DEFINER), so this proves that check, not just table-level RLS.
select test.assert_raises(
  format('select public.transition_booking_status(%L, %L)', :'bk_e_id', 'cancelled'),
  'Customer F cannot cancel Customer E''s booking via transition_booking_status()'
);

-- Customer E can cancel their own draft/requested booking.
select test.as_user('e0000000-0000-0000-0000-00000000000e');
select test.assert(
  (public.transition_booking_status(:'bk_e_id', 'cancelled')).status = 'cancelled',
  'Customer E can cancel their own requested booking'
);

-- But Customer E cannot jump straight to 'accepted' themselves — that's
-- an organization action, not a customer one.
select test.as_user('f0000000-0000-0000-0000-00000000000f');
select test.assert_raises(
  format('select public.transition_booking_status(%L, %L)', :'bk_f_id', 'accepted'),
  'Customer F cannot accept their own booking (only an org member can)'
);

select test.as_superuser();
\echo '02_customer_ownership.sql: all assertions passed'
