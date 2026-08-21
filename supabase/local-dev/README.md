# Local development harness (not part of the Supabase project)

Everything in this directory exists **only** to run and test the migrations
in `supabase/migrations/` against a plain, vanilla Postgres instance, for
environments where the full Supabase CLI local stack (`supabase start`,
which requires Docker) is unavailable — e.g. this sandbox.

**None of this ever runs against a real Supabase project.** A real Supabase
project already provides the `auth` schema, `auth.uid()`/`auth.role()`, and
the `anon`/`authenticated`/`service_role` roles — recreating them there would
conflict with the real thing. `supabase/migrations/*.sql` never references
anything in this directory.

- `auth-shim.sql` — creates a minimal `auth.users` table and
  `auth.uid()` / `auth.role()` / `auth.jwt()` functions that read the same
  `request.jwt.claims` GUC Supabase's real Postgrest/GoTrue stack sets, plus
  the `anon` / `authenticated` / `service_role` roles migrations grant to.
- `run-migrations.sh [db_name]` — (re)creates a scratch database, applies the
  shim, then applies every file in `supabase/migrations/` in order.
- `run-tests.sh` — runs `run-migrations.sh`, applies `supabase/seed.sql`,
  applies `supabase/tests/00_helpers.sql`, then every numbered file in
  `supabase/tests/` in order, then `concurrency-test.sh`. Fails loudly (and
  stops) on the first assertion that doesn't hold.
- `concurrency-test.sh [db_name]` — sets up two 'requested' bookings on the
  same vehicle with overlapping ranges, launches two real concurrent psql
  sessions that both try to accept theirs, and asserts exactly one succeeds.
  Run standalone or via `run-tests.sh`.
- `introspect.sql` + `generate-types.mjs` + `generate-types.sh` — regenerate
  `src/lib/database.types.ts` from the current schema. `supabase gen types
typescript --db-url` also shells out to Docker on this CLI version, so
  this hand-rolled generator (introspection query -> small Node script) is
  the substitute; run `generate-types.sh [db_name]` after changing any
  migration that adds/renames a table, column, view, or enum.

Once Docker/`supabase start` is available, prefer that (and the real
`supabase gen types`) instead — this harness is a stand-in, not a
replacement.
