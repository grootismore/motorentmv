-- organizations: a rental business. RLS policies land once
-- organization_members + membership helper functions exist (see
-- 20260821120007_membership_policies.sql).
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  -- Set immediately (BEFORE INSERT, no cross-table dependency) so the
  -- creator can see the row in the INSERT's own RETURNING output without
  -- waiting on the AFTER INSERT trigger that adds their owner membership —
  -- Postgres checks RETURNING against SELECT policies at insert time,
  -- before that trigger has run, so a policy that depended only on
  -- organization_members would reject the RETURNING row with "new row
  -- violates row-level security policy" even though the INSERT itself was
  -- legitimate. See organizations_select_creator below.
  created_by uuid not null default auth.uid() references public.profiles (id),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  currency text not null default 'MVR',
  -- Fixed IANA zone per PRD §6.2: all timestamps stored in UTC, displayed
  -- in Indian/Maldives (UTC+5, no DST). Not user-configurable in the MVP.
  timezone text not null default 'Indian/Maldives',
  default_location text,
  -- Flexible for MVP: hours-per-day and cancellation/deposit/late-fee
  -- policy shapes are still open PRD decisions (§16). jsonb avoids
  -- speculative columns for a taxonomy that hasn't been confirmed yet.
  business_hours jsonb not null default '{}'::jsonb,
  policies jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;

-- See the created_by comment above for why this exists independently of
-- the membership-based policy added once organization_members exists
-- (20260821120007_membership_policies.sql) — multiple permissive SELECT
-- policies on the same table are OR'd together by Postgres, so this one
-- only ever *adds* visibility, never removes any.
create policy "organizations_select_creator"
  on public.organizations for select
  to authenticated
  using (created_by = auth.uid());

grant select, insert, update on public.organizations to authenticated;
