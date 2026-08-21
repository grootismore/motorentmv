-- profiles: one row per auth user. Minimal personal data (PRD §10).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  email text,
  avatar_url text,
  -- Platform admin is a global role, not organization-scoped (PRD §4).
  -- Column-level privileges below stop a user from granting it to
  -- themselves; it is only ever set by the service role.
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth.users id. Created automatically on sign-up.';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up, so the app
-- never has to special-case "no profile yet".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

alter table public.profiles enable row level security;

-- Users can read/update their own profile; platform admins can read any
-- profile (support/moderation). Broader "can an org member see this
-- profile" visibility is added in the membership-policies migration once
-- organization_members exists.
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_platform_admin());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Column-level privilege: even though the row-level policy above allows a
-- user to update their own row, `is_platform_admin` (and every other
-- column) must never be settable by the user themselves except this
-- explicit allow-list. Only the table owner / service_role (which
-- bypasses grants) can change anything else, including inserting rows —
-- profile creation only ever happens via handle_new_user() above.
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;
