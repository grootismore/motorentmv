-- Minimal test helpers. Not part of the Supabase migrations — applied
-- directly by run-tests.sh against the scratch database, after
-- migrations, before the numbered test files.
create schema if not exists test;

create or replace function test.assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'ASSERTION FAILED: %', p_message using errcode = 'P0001';
  end if;
  raise notice 'ok: %', p_message;
end;
$$;

-- Simulates "this request is authenticated as this user" the same way
-- PostgREST would set request.jwt.claims from a verified JWT.
-- Session-level (not `set local`/transaction-local): psql runs each
-- top-level statement as its own implicit transaction unless explicitly
-- wrapped in BEGIN/COMMIT, so a transaction-local GUC/role would revert
-- before the very next statement. Session-level is what actually lets
-- "act as user X" persist across the several statements a test needs.
-- RESET ROLE first: once a test statement is running as `authenticated`,
-- switching to a *different* simulated user still has to go through this
-- same function, so it must be able to get back to the real session_user
-- (postgres, always permitted) before re-issuing SET ROLE — otherwise the
-- second `as_user()` call in a test file would run as `authenticated`
-- trying to SET ROLE authenticated again, which works, but would leave
-- request.jwt.claims and role changes racing each other across calls.
create or replace function test.as_user(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end;
$$;

create or replace function test.as_anon()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, false);
  execute 'set role anon';
end;
$$;

create or replace function test.as_superuser()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);
end;
$$;

-- Runs p_sql expecting it to raise; fails the assertion if it doesn't.
-- Used to prove RLS/constraints reject something, not just that
-- permitted things work.
create or replace function test.assert_raises(p_sql text, p_message text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'ok: % (rejected as expected: %)', p_message, sqlerrm;
    return;
  end;
  raise exception 'ASSERTION FAILED: % (expected an error, none was raised)', p_message using errcode = 'P0001';
end;
$$;

-- Runs p_sql expecting it to raise, and returns the error message instead
-- of just asserting one was thrown — for tests that need to check the
-- message's exact content (e.g. that a conflict explanation doesn't leak
-- another customer's data), not merely that an error occurred.
create or replace function test.capture_error_message(p_sql text)
returns text
language plpgsql
as $$
begin
  execute p_sql;
  return null;
exception when others then
  return sqlerrm;
end;
$$;

-- The `test` schema is a local harness convenience, never exposed via the
-- real Data API (it isn't in api.schemas on a real project) — so granting
-- anon/authenticated access to it here doesn't weaken anything a real
-- client could reach. Without this, `authenticated`/`anon` can't even
-- resolve `test.as_user(...)` by qualified name (schema-level USAGE is
-- checked before any function-level EXECUTE grant) — every test after
-- the first identity switch would fail with "permission denied for
-- schema test". Placed last so it covers every function defined above.
grant usage on schema test to anon, authenticated;
grant execute on all functions in schema test to anon, authenticated;
