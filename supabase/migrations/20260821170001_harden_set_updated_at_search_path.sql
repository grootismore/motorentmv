-- The Supabase security advisor flagged set_updated_at() as the one
-- function in this schema without an explicit search_path -- every other
-- trigger/RPC function already sets one (see e.g. handle_new_user() in
-- 20260821120003_profiles.sql), this one was simply missed when it was
-- first written (20260821120002_utility_functions.sql). A mutable
-- search_path on a SECURITY INVOKER function is lower-severity than on a
-- SECURITY DEFINER one, but locking it down is a real, zero-behavior-
-- change hardening fix, not a judgment call to skip.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
