-- Minimal stand-in for Supabase Storage's schema, matching real column
-- names/shapes closely enough to test this project's storage.objects RLS
-- policies locally. See README.md in this directory — never runs against
-- a real Supabase project, which already provides all of this (owned by
-- supabase_storage_admin, with RLS already enabled on storage.objects).
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

-- Real Supabase helper used by storage RLS policies to split an object
-- path into segments (everything except the filename).
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1 : array_length(_parts, 1) - 1];
end;
$$;

grant usage on schema storage to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
grant select, insert, delete on storage.objects to anon, authenticated;
