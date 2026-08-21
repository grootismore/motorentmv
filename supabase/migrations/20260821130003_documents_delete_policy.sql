-- documents had no DELETE policy at all — needed now that fleet photo
-- management (Prompt 3) actually removes photos. Scoped narrowly to what
-- that feature needs: an org member with fleet-write access can delete a
-- vehicle-scoped document (photos today; any future vehicle-scoped
-- document type inherits the same rule), and an uploader can delete their
-- own not-yet-verified upload — symmetric with the update policy's
-- "uploader can edit their own pending upload" rule in
-- 20260821120017_documents.sql.
create policy "documents_delete_org_or_uploader"
  on public.documents for delete
  to authenticated
  using (
    (uploaded_by = auth.uid() and status = 'pending')
    or (vehicle_id is not null and exists (
      select 1 from public.vehicles v
      where v.id = documents.vehicle_id
        and public.has_org_role(v.organization_id, array['owner', 'manager']::public.org_role[])
    ))
  );

grant delete on public.documents to authenticated;
