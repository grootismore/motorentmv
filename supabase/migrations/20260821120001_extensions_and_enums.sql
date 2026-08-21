-- Extensions -----------------------------------------------------------
-- pgcrypto: gen_random_uuid() for primary keys.
-- btree_gist: required for GiST exclusion constraints over scalar +
-- range columns together (vehicle_id WITH =, tstzrange(...) WITH &&),
-- which is how server-side booking-overlap protection is enforced.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- Enums ------------------------------------------------------------------

create type public.org_role as enum ('owner', 'manager', 'staff');
create type public.member_status as enum ('invited', 'active', 'revoked');

create type public.vehicle_status as enum (
  'draft', 'available', 'reserved', 'rented', 'maintenance', 'inactive'
);
create type public.transmission_type as enum ('automatic', 'manual');
create type public.rate_type as enum ('hourly', 'daily');

-- PRD 6.3: draft -> requested -> accepted -> ready -> active -> completed,
-- plus declined, needs_info, cancelled and overdue (derived from an active
-- booking whose return time has passed).
create type public.booking_status as enum (
  'draft', 'requested', 'accepted', 'declined', 'needs_info',
  'ready', 'active', 'completed', 'cancelled', 'overdue'
);
create type public.payment_status as enum (
  'unpaid', 'partially_paid', 'paid', 'partially_refunded', 'refunded'
);
create type public.transaction_type as enum ('payment', 'refund', 'adjustment');
create type public.payment_method as enum ('cash', 'bank_transfer', 'external_reference');

create type public.inspection_type as enum ('pickup', 'return');

create type public.document_type as enum (
  'license', 'id_card', 'vehicle_photo',
  'inspection_photo_before', 'inspection_photo_after',
  'receipt', 'other'
);
create type public.document_status as enum ('pending', 'verified', 'rejected');
