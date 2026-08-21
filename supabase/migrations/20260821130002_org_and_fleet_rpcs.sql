-- Staff invitation (placeholder-level) and vehicle rate changes both need
-- to write columns/tables a direct client grant deliberately doesn't
-- allow (see 20260821120007 and 20260821120009) — same pattern as
-- transition_booking_status: SECURITY DEFINER, with the function body
-- re-implementing the authorization check RLS would otherwise provide.

-- Placeholder-level invitation: the current schema only supports adding a
-- member who already has a profile (organization_members.user_id is
-- NOT NULL). There is no pending-invite-by-email-before-signup mechanism
-- here — this looks up an existing account by email and adds them
-- directly, or tells the caller no such account exists yet. A real
-- "invite anyone by email" flow (invite tokens, sign-up linking) is a
-- later-phase decision, not implemented here.
create or replace function public.invite_org_member_by_email(
  p_organization_id uuid,
  p_email text,
  p_role public.org_role
)
returns public.organization_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_user_id uuid;
  v_member public.organization_members;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not (
    (p_role = 'staff' and public.has_org_role(p_organization_id, array['owner', 'manager']::public.org_role[]))
    or (p_role in ('manager', 'owner') and public.has_org_role(p_organization_id, array['owner']::public.org_role[]))
  ) then
    raise exception 'not authorized to invite a % to this organization', p_role using errcode = '42501';
  end if;

  select id into v_user_id from public.profiles where lower(email) = lower(p_email) limit 1;

  if v_user_id is null then
    raise exception 'no account found for %', p_email using errcode = 'P0002';
  end if;

  insert into public.organization_members (organization_id, user_id, role, status, invited_by)
  values (p_organization_id, v_user_id, p_role, 'invited', v_actor)
  on conflict (organization_id, user_id) do update
    set role = excluded.role, status = 'invited', invited_by = excluded.invited_by
  returning * into v_member;

  return v_member;
end;
$$;

grant execute on function public.invite_org_member_by_email(uuid, text, public.org_role) to authenticated;

-- Rate changes must close the previous open-ended window and open a new
-- one atomically — two separate client writes could race (the exclusion
-- constraint in 20260821120009 would reject the second write of a naive
-- close-then-insert done as two round trips if another one happened in
-- between). p_amount_laari of null means "stop charging this rate type"
-- (e.g. a vehicle with only a daily rate, no hourly option).
create or replace function public.set_vehicle_rate(
  p_vehicle_id uuid,
  p_rate_type public.rate_type,
  p_amount_laari integer
)
returns public.vehicle_rates
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid;
  v_rate public.vehicle_rates;
begin
  select organization_id into v_organization_id from public.vehicles where id = p_vehicle_id;
  if v_organization_id is null then
    raise exception 'vehicle % not found', p_vehicle_id using errcode = 'P0002';
  end if;

  if not public.has_org_role(v_organization_id, array['owner', 'manager']::public.org_role[]) then
    raise exception 'not authorized to change rates for vehicle %', p_vehicle_id using errcode = '42501';
  end if;

  if p_amount_laari is not null and p_amount_laari < 0 then
    raise exception 'amount_laari must not be negative' using errcode = '22023';
  end if;

  update public.vehicle_rates
  set effective_to = now()
  where vehicle_id = p_vehicle_id and rate_type = p_rate_type and effective_to is null;

  if p_amount_laari is null then
    return null;
  end if;

  insert into public.vehicle_rates (vehicle_id, rate_type, amount_laari, effective_from)
  values (p_vehicle_id, p_rate_type, p_amount_laari, now())
  returning * into v_rate;

  return v_rate;
end;
$$;

grant execute on function public.set_vehicle_rate(uuid, public.rate_type, integer) to authenticated;
