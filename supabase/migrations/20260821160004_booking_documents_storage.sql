-- Private storage for booking-scoped documents -- inspection before/after
-- photos today (PRD Prompt 6), any future booking-scoped upload type
-- inherits the same rule. Mirrors 20260821130001_vehicle_photo_storage's
-- shape exactly: path convention `{booking_id}/{filename}`, authorization
-- always re-derived from the bookings row via booking_id, never trusted
-- from the path segment directly. Never public, and never a fixed TTL
-- signed URL cached client-side -- see src/features/fleet/photos.ts's
-- `meta: { persist: false }` convention, reused for inspection photos.
insert into storage.buckets (id, name, public)
values ('booking-documents', 'booking-documents', false)
on conflict (id) do nothing;

create policy "booking_documents_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'booking-documents'
    and exists (
      select 1 from public.bookings b
      where b.id = (storage.foldername(name))[1]::uuid
        and (b.customer_id = auth.uid() or public.is_org_member(b.organization_id))
    )
  );

-- Org staff run the checklist and attach the photos (same "only org staff
-- run checklists" rule as the inspections table's own write policy) --
-- not role-restricted to owner/manager, since front-desk handover is a
-- normal staff task.
create policy "booking_documents_insert_org_member"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'booking-documents'
    and exists (
      select 1 from public.bookings b
      where b.id = (storage.foldername(name))[1]::uuid and public.is_org_member(b.organization_id)
    )
  );

-- A retake before the customer has acknowledged the inspection (e.g. a
-- blurry photo) is a normal staff correction, same spirit as
-- documents_delete_org_or_uploader's "uploader can delete their own
-- not-yet-verified upload".
create policy "booking_documents_delete_org_member"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'booking-documents'
    and exists (
      select 1 from public.bookings b
      where b.id = (storage.foldername(name))[1]::uuid and public.is_org_member(b.organization_id)
    )
  );
