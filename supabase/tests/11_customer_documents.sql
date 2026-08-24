-- Proves: customer-documents storage policies scope strictly to the
-- uploading customer's own auth.uid() (the {profile_id}/{filename} path
-- segment) -- not even the renting organization can see these, unlike
-- vehicle/booking documents.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('b0000000-0000-0000-0000-000000000001', 'renter-m@example.com'),
  ('b0000000-0000-0000-0000-000000000002', 'customer-m@example.com'),
  ('b0000000-0000-0000-0000-000000000003', 'other-customer-m@example.com');

select test.as_user('b0000000-0000-0000-0000-000000000001');
insert into public.organizations (name, slug) values ('Org M', 'org-m-documents-test') returning id \gset org_

-- The customer uploads their own license photo.
select test.as_user('b0000000-0000-0000-0000-000000000002');
insert into storage.objects (bucket_id, name, owner)
values ('customer-documents', 'b0000000-0000-0000-0000-000000000002/license.jpg', 'b0000000-0000-0000-0000-000000000002');
insert into public.documents (profile_id, document_type, storage_path, uploaded_by)
values ('b0000000-0000-0000-0000-000000000002', 'license', 'b0000000-0000-0000-0000-000000000002/license.jpg', 'b0000000-0000-0000-0000-000000000002')
returning id \gset doc_

select test.assert(
  (select count(*) from storage.objects where bucket_id = 'customer-documents' and name = 'b0000000-0000-0000-0000-000000000002/license.jpg') = 1,
  'A customer can see their own uploaded document'
);
select test.assert(
  (select count(*) from public.documents where id = :'doc_id') = 1,
  'A customer can see their own document metadata row'
);

-- Another customer cannot upload into someone else's folder...
select test.as_user('b0000000-0000-0000-0000-000000000003');
select test.assert_raises(
  format('insert into storage.objects (bucket_id, name, owner) values (%L, %L, %L)',
    'customer-documents', 'b0000000-0000-0000-0000-000000000002/forged.jpg', 'b0000000-0000-0000-0000-000000000003'),
  'A customer cannot upload into another customer''s document folder'
);

-- ...nor see it...
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'customer-documents' and name = 'b0000000-0000-0000-0000-000000000002/license.jpg') = 0,
  'Another customer cannot see this document in storage'
);
select test.assert(
  (select count(*) from public.documents where id = :'doc_id') = 0,
  'Another customer cannot see this document''s metadata row'
);
-- ...nor delete it (silently affects zero rows, same class of proof as
-- 04_storage_and_rpcs.sql's outsider-delete assertions).
delete from storage.objects where bucket_id = 'customer-documents' and name = 'b0000000-0000-0000-0000-000000000002/license.jpg';
select test.as_superuser();
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'customer-documents' and name = 'b0000000-0000-0000-0000-000000000002/license.jpg') = 1,
  'Another customer''s delete attempt silently affected zero rows -- the document still exists'
);

-- The org the customer might rent from has no visibility into it either
-- -- profile-scoped documents are personal, not org-scoped.
select test.as_user('b0000000-0000-0000-0000-000000000001');
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'customer-documents' and name = 'b0000000-0000-0000-0000-000000000002/license.jpg') = 0,
  'A renting organization cannot see a customer''s personal document'
);

-- The owning customer can delete their own pending upload.
select test.as_user('b0000000-0000-0000-0000-000000000002');
delete from storage.objects where bucket_id = 'customer-documents' and name = 'b0000000-0000-0000-0000-000000000002/license.jpg';
delete from public.documents where id = :'doc_id';
select test.as_superuser();
select test.assert(
  (select count(*) from storage.objects where bucket_id = 'customer-documents' and name = 'b0000000-0000-0000-0000-000000000002/license.jpg') = 0,
  'The owning customer can delete their own document from storage'
);
select test.assert(
  (select count(*) from public.documents where id = :'doc_id') = 0,
  'The owning customer can delete their own document metadata row'
);

\echo '11_customer_documents.sql: all assertions passed'
