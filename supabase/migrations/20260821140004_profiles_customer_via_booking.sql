-- The booking inbox needs to show a renter/staff member who's requesting
-- a rental — name/phone/email from profiles — but the two existing
-- profiles SELECT policies (own-or-admin; org colleague) only cover a
-- user's own profile or a fellow *organization member*. A customer is
-- neither, so without this policy an org member could see that a booking
-- exists but not who it's for. Scoped narrowly to "this profile belongs
-- to a customer who has (or had) a booking with one of my active
-- organizations" — not blanket cross-user visibility.
create policy "profiles_select_customer_via_booking"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.customer_id = profiles.id
        and public.is_org_member(b.organization_id)
    )
  );
