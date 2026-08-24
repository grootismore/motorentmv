-- Private storage for a customer's own profile-scoped documents (license,
-- ID card -- PRD §6.1/§6.5/§7's "Profile/documents" screen). Path
-- convention is `{profile_id}/{filename}`, same shape as
-- 20260821130001_vehicle_photo_storage and 20260821160004_booking_
-- documents_storage: authorization is always re-derived from the path's
-- profile_id segment being the caller's own auth.uid(), never trusted
-- from anywhere else.
--
-- Unlike vehicle/booking documents, nobody else -- not even the renting
-- organization -- gets read access here. A personal license/ID photo has
-- no booking or organization context at upload time (PRD: customer access
-- is "Only own profile, documents and bookings"); an org verifying a
-- specific renter's documents at handover is a booking-scoped concern the
-- existing booking-documents bucket already covers, not this one.
insert into storage.buckets (id, name, public)
values ('customer-documents', 'customer-documents', false)
on conflict (id) do nothing;

create policy "customer_documents_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1]::uuid = auth.uid()
  );

create policy "customer_documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1]::uuid = auth.uid()
  );

-- Symmetric with documents_delete_org_or_uploader's "uploader can delete
-- their own not-yet-verified upload" -- the documents metadata row is
-- already gated that way; this is the matching storage-object half.
create policy "customer_documents_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1]::uuid = auth.uid()
  );
