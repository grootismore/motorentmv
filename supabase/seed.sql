-- Demo fixture data: one renter organization, one staff member, one
-- customer, and two vehicles with current rates. Intended for local
-- development and the automated test harness — not for a production
-- project.
--
-- Runs as the table owner (service role / migration role), so it
-- bypasses RLS regardless of the simulated JWT claims below; those are
-- set only so the organizations INSERT trigger (which reads auth.uid()
-- to create the owner's membership row) attributes the org to the right
-- demo user, exactly as it would for a real signed-in request.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@motorentmv.test'),
  ('00000000-0000-0000-0000-000000000002', 'staff@motorentmv.test'),
  ('00000000-0000-0000-0000-000000000003', 'customer@motorentmv.test')
on conflict (id) do nothing;

update public.profiles set full_name = 'Aishath Owner' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set full_name = 'Hassan Staff' where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set full_name = 'Mariyam Customer' where id = '00000000-0000-0000-0000-000000000003';

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, false);

insert into public.organizations (id, name, slug, currency, timezone, default_location)
values (
  '00000000-0000-0000-0000-0000000000a1',
  'Hulhumale Scooters',
  'hulhumale-scooters',
  'MVR',
  'Indian/Maldives',
  'Hulhumale'
)
on conflict (id) do nothing;

select set_config('request.jwt.claims', '', false);

insert into public.organization_members (organization_id, user_id, role, status, invited_by)
values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000002',
  'staff',
  'active',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (organization_id, user_id) do nothing;

insert into public.vehicles (
  id, organization_id, internal_code, registration_number, make, model, year,
  category, transmission, engine_size_cc, color, status, odometer_km,
  deposit_amount_laari, location, included_accessories
) values
  (
    '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1',
    'HS-01', 'P-1001-AA', 'Honda', 'Activa', 2023,
    'scooter', 'automatic', 110, 'Red', 'available', 1200,
    200000, 'Hulhumale', array['helmet']
  ),
  (
    '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1',
    'HS-02', 'P-1002-AB', 'Yamaha', 'NMAX', 2022,
    'scooter', 'automatic', 155, 'Blue', 'available', 4300,
    250000, 'Hulhumale', array['helmet', 'phone-mount']
  ),
  (
    '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1',
    'HS-03', 'P-1003-AC', 'Honda', 'Dio', 2021,
    'scooter', 'automatic', 110, 'White', 'maintenance', 8100,
    200000, 'Hulhumale', array['helmet']
  )
on conflict (id) do nothing;

insert into public.vehicle_rates (vehicle_id, rate_type, amount_laari) values
  ('00000000-0000-0000-0000-0000000000b1', 'daily', 30000),
  ('00000000-0000-0000-0000-0000000000b1', 'hourly', 5000),
  ('00000000-0000-0000-0000-0000000000b2', 'daily', 40000),
  ('00000000-0000-0000-0000-0000000000b2', 'hourly', 6000),
  ('00000000-0000-0000-0000-0000000000b3', 'daily', 25000)
on conflict do nothing;

-- The maintenance vehicle has an explicit block explaining why.
insert into public.availability_blocks (vehicle_id, starts_at, ends_at, reason, created_by)
values (
  '00000000-0000-0000-0000-0000000000b3',
  now() - interval '1 day',
  now() + interval '2 day',
  'Brake service',
  '00000000-0000-0000-0000-000000000001'
);
