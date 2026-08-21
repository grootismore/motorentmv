-- organization_members: user <-> organization, with role and invitation
-- lifecycle (PRD §6.1: "Organization invitation for staff with
-- revocation and role changes"). One row per (organization, user) pair —
-- revocation/re-invitation flips `status` in place rather than creating
-- new rows, so "unique active membership" holds by construction.
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null,
  status public.member_status not null default 'invited',
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);
create index organization_members_org_id_idx on public.organization_members (organization_id);

create trigger set_organization_members_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

alter table public.organization_members enable row level security;

grant select, insert, update on public.organization_members to authenticated;
