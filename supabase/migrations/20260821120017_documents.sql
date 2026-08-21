-- documents: private object *metadata* only — the file bytes live in
-- Supabase Storage private buckets (PRD §6.5/§10: "private storage and
-- short-lived signed access; authorization is checked before every
-- read"). Storage bucket policies on storage.objects mirroring this
-- table's authorization are a deliberate follow-up: Storage's schema
-- isn't part of this migration set (it's platform-provisioned, not
-- something these migrations create), and configuring it needs a real
-- Supabase project rather than the vanilla-Postgres harness this test
-- suite runs against. Every signed-URL request should still check the
-- matching `documents` row's authorization before issuing one.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  -- Exactly which of these apply depends on document_type; the check
  -- constraint below only requires *at least one* owning reference so a
  -- vehicle photo, a customer's license, a booking's inspection photo and
  -- an expense receipt can all share one table without five near-empty
  -- ones.
  organization_id uuid references public.organizations (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  expense_id uuid references public.expenses (id) on delete cascade,
  document_type public.document_type not null,
  storage_path text not null,
  status public.document_status not null default 'pending',
  expires_at timestamptz,
  uploaded_by uuid not null references public.profiles (id),
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(organization_id, vehicle_id, booking_id, profile_id, expense_id) >= 1)
);

create index documents_organization_id_idx on public.documents (organization_id);
create index documents_vehicle_id_idx on public.documents (vehicle_id);
create index documents_booking_id_idx on public.documents (booking_id);
create index documents_profile_id_idx on public.documents (profile_id);
create index documents_expense_id_idx on public.documents (expense_id);

alter table public.documents enable row level security;

create policy "documents_select"
  on public.documents for select
  to authenticated
  using (
    uploaded_by = auth.uid()
    or profile_id = auth.uid()
    or (organization_id is not null and public.is_org_member(organization_id))
    or (vehicle_id is not null and exists (
      select 1 from public.vehicles v where v.id = documents.vehicle_id and public.is_org_member(v.organization_id)
    ))
    or (booking_id is not null and exists (
      select 1 from public.bookings b
      where b.id = documents.booking_id and (b.customer_id = auth.uid() or public.is_org_member(b.organization_id))
    ))
    or (expense_id is not null and exists (
      select 1 from public.expenses e where e.id = documents.expense_id and public.has_financial_access(e.organization_id)
    ))
    or public.is_platform_admin()
  );

create policy "documents_insert"
  on public.documents for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      profile_id = auth.uid()
      or (organization_id is not null and public.is_org_member(organization_id))
      or (vehicle_id is not null and exists (
        select 1 from public.vehicles v where v.id = documents.vehicle_id and public.is_org_member(v.organization_id)
      ))
      or (booking_id is not null and exists (
        select 1 from public.bookings b
        where b.id = documents.booking_id and (b.customer_id = auth.uid() or public.is_org_member(b.organization_id))
      ))
      or (expense_id is not null and exists (
        select 1 from public.expenses e where e.id = documents.expense_id and public.has_financial_access(e.organization_id)
      ))
    )
  );

-- Verification (status/verified_by/verified_at) is an org-staff action on
-- org-scoped documents; an uploader may still replace their own
-- not-yet-verified upload (e.g. a blurry retake) but can't self-verify.
create policy "documents_update_org_or_uploader"
  on public.documents for update
  to authenticated
  using (
    (uploaded_by = auth.uid() and status = 'pending')
    or (organization_id is not null and public.is_org_member(organization_id))
    or (vehicle_id is not null and exists (
      select 1 from public.vehicles v where v.id = documents.vehicle_id and public.is_org_member(v.organization_id)
    ))
    or (booking_id is not null and exists (
      select 1 from public.bookings b where b.id = documents.booking_id and public.is_org_member(b.organization_id)
    ))
  );

grant select on public.documents to authenticated;
-- Column-restricted: status/verified_by/verified_at are excluded so a
-- fresh upload can't self-declare 'verified' at INSERT time — same class
-- of gap as bookings' snapshot columns. They default to 'pending'/null
-- and only change via the UPDATE policy's verification-workflow check.
grant insert (organization_id, vehicle_id, booking_id, profile_id, expense_id, document_type, storage_path, expires_at, uploaded_by)
  on public.documents to authenticated;
grant update (storage_path, status, verified_by, verified_at, expires_at) on public.documents to authenticated;
