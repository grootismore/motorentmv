-- Prompt 5: customer discovery — search, listing detail and quote preview
-- for anonymous browsers (PRD: browse first, authenticate only to submit
-- a request). Every function here is SECURITY DEFINER with its own
-- narrow authorization check, following the same pattern as
-- transition_booking_status()/accept_booking() etc: the definer bypasses
-- RLS on purpose (anon has none on vehicles/vehicle_rates/organizations),
-- but only ever returns the same "available vehicle" subset those tables'
-- own discovery policies already treat as non-sensitive — never draft
-- vehicles, other customers' bookings, or anything org-internal.
--
-- Server-side overlap correctness for search itself is the actual
-- guarantee here (PRD: "search must return only bookable vehicles for
-- the requested UTC interval") — every timestamp parameter is a
-- timestamptz, compared with the same half-open '[)' semantics as the
-- booking engine, so a client's local time zone never enters the
-- comparison; only display formatting does.

create or replace function public.search_available_vehicles(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location text default null,
  p_category text default null,
  p_transmission public.transmission_type default null,
  p_max_daily_rate_laari integer default null
)
returns table (
  vehicle_id uuid,
  organization_id uuid,
  organization_name text,
  registration_number text,
  make text,
  model text,
  year integer,
  category text,
  transmission public.transmission_type,
  color text,
  location text,
  deposit_amount_laari integer,
  daily_rate_laari integer,
  hourly_rate_laari integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_ends_at <= p_starts_at then
    raise exception 'ends_at must be after starts_at' using errcode = '22023';
  end if;

  return query
  select
    v.id,
    v.organization_id,
    o.name,
    v.registration_number,
    v.make,
    v.model,
    v.year,
    v.category,
    v.transmission,
    v.color,
    v.location,
    v.deposit_amount_laari,
    daily.amount_laari,
    hourly.amount_laari
  from public.vehicles v
  join public.organizations o on o.id = v.organization_id
  left join public.vehicle_rates daily
    on daily.vehicle_id = v.id and daily.rate_type = 'daily' and daily.effective_to is null
  left join public.vehicle_rates hourly
    on hourly.vehicle_id = v.id and hourly.rate_type = 'hourly' and hourly.effective_to is null
  where v.status = 'available'
    and (p_location is null or coalesce(v.location, o.default_location, '') ilike '%' || p_location || '%')
    and (p_category is null or v.category = p_category)
    and (p_transmission is null or v.transmission = p_transmission)
    and (p_max_daily_rate_laari is null or daily.amount_laari is null or daily.amount_laari <= p_max_daily_rate_laari)
    -- Excludes any vehicle with a confirmed booking overlapping the
    -- requested range. vehicle_busy_ranges carries no customer identity
    -- (see 20260821120011) — search never needs it and never gets it.
    and not exists (
      select 1 from public.vehicle_busy_ranges br
      where br.vehicle_id = v.id
        and tstzrange(br.starts_at, br.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
    )
    and not exists (
      select 1 from public.availability_blocks ab
      where ab.vehicle_id = v.id
        and tstzrange(ab.starts_at, ab.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
    )
  order by daily.amount_laari nulls last, hourly.amount_laari nulls last, v.created_at desc;
end;
$$;

grant execute on function public.search_available_vehicles(
  timestamptz, timestamptz, text, text, public.transmission_type, integer
) to anon, authenticated;

-- Single-vehicle counterpart of the same "available" subset, for the
-- listing detail screen. Deliberately returns nothing (not an error) for
-- a vehicle that isn't available — from a browsing customer's
-- perspective a draft/retired/rented-out vehicle simply isn't a listing,
-- the same way it never appeared in search results.
create or replace function public.get_vehicle_listing(p_vehicle_id uuid)
returns table (
  vehicle_id uuid,
  organization_id uuid,
  organization_name text,
  registration_number text,
  make text,
  model text,
  year integer,
  category text,
  transmission public.transmission_type,
  color text,
  location text,
  included_accessories text[],
  deposit_amount_laari integer,
  daily_rate_laari integer,
  hourly_rate_laari integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    v.id,
    v.organization_id,
    o.name,
    v.registration_number,
    v.make,
    v.model,
    v.year,
    v.category,
    v.transmission,
    v.color,
    v.location,
    v.included_accessories,
    v.deposit_amount_laari,
    daily.amount_laari,
    hourly.amount_laari
  from public.vehicles v
  join public.organizations o on o.id = v.organization_id
  left join public.vehicle_rates daily
    on daily.vehicle_id = v.id and daily.rate_type = 'daily' and daily.effective_to is null
  left join public.vehicle_rates hourly
    on hourly.vehicle_id = v.id and hourly.rate_type = 'hourly' and hourly.effective_to is null
  where v.id = p_vehicle_id
    and v.status = 'available';
$$;

grant execute on function public.get_vehicle_listing(uuid) to anon, authenticated;

-- Public quote preview: identical numbers to what accept_booking() will
-- freeze later (both call compute_booking_quote()), but reachable before
-- sign-in so a browsing customer sees an itemized price on the listing
-- screen. compute_booking_quote() is SECURITY INVOKER and reads
-- vehicles/vehicle_rates directly — calling it from inside this
-- SECURITY DEFINER wrapper runs it as this function's owner, the same
-- owner-bypasses-RLS mechanism used throughout this schema, not a
-- separate privilege escalation. The availability check below is what
-- actually gates it to "available" vehicles only.
create or replace function public.get_listing_quote(
  p_vehicle_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.vehicles where id = p_vehicle_id and status = 'available') then
    raise exception 'vehicle % not found', p_vehicle_id using errcode = 'P0002';
  end if;

  return public.compute_booking_quote(p_vehicle_id, p_starts_at, p_ends_at);
end;
$$;

grant execute on function public.get_listing_quote(uuid, timestamptz, timestamptz) to anon, authenticated;

-- A courtesy freshness check for the listing screen (e.g. re-checked
-- right before "Request to book" is enabled, since search results can go
-- stale while a customer is browsing) — not a security boundary. The
-- actual concurrency-safe guarantee against double-booking is still the
-- bookings table's own exclusion constraint at accept time (PRD §6.2/6.4):
-- multiple customers may legitimately *request* the same range, same as
-- the renter side's request_booking() already allows.
create or replace function public.is_vehicle_bookable(
  p_vehicle_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (select 1 from public.vehicles where id = p_vehicle_id and status = 'available')
    and not exists (
      select 1 from public.vehicle_busy_ranges br
      where br.vehicle_id = p_vehicle_id
        and tstzrange(br.starts_at, br.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
    )
    and not exists (
      select 1 from public.availability_blocks ab
      where ab.vehicle_id = p_vehicle_id
        and tstzrange(ab.starts_at, ab.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
    );
$$;

grant execute on function public.is_vehicle_bookable(uuid, timestamptz, timestamptz) to anon, authenticated;

-- RLS policy USING clauses run with the *querying role's* own privileges
-- for any table they reference in a subquery — they don't inherit a
-- SECURITY DEFINER function's elevated privileges the way a nested
-- function call does. Since anon deliberately has no grant on
-- `vehicles` (discovery goes through the RPCs above, never direct table
-- reads), a raw `exists (select ... from vehicles ...)` inside a policy
-- would fail for anon with "permission denied for table vehicles" —
-- confirmed by a real failed test run. This is exactly why
-- is_org_member()/has_org_role() exist as SECURITY DEFINER helpers
-- elsewhere in this schema instead of inlined subqueries; the same fix
-- applies here.
create or replace function public.is_vehicle_available_public(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.vehicles where id = p_vehicle_id and status = 'available');
$$;

-- Vehicle photos are the one piece of listing data that can't go through
-- an RPC (Storage signed URLs are issued by the Storage API itself,
-- which checks storage.objects RLS directly) — so, narrowly, extend read
-- access for exactly the "vehicle_photo of an available vehicle" case to
-- anon. Every other document/document_type stays authenticated-only,
-- unaffected by this — this is an additive policy, not a change to the
-- existing one.
create policy "documents_select_public_vehicle_photo"
  on public.documents for select
  to anon
  using (
    document_type = 'vehicle_photo'
    and vehicle_id is not null
    and public.is_vehicle_available_public(vehicle_id)
  );

grant select on public.documents to anon;

create policy "vehicle_photos_select_public"
  on storage.objects for select
  to anon
  using (
    bucket_id = 'vehicle-photos'
    and public.is_vehicle_available_public((storage.foldername(name))[1]::uuid)
  );
