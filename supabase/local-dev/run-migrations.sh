#!/usr/bin/env bash
# Recreates a scratch database and applies the auth shim + every migration
# in supabase/migrations/, in filename order. See README.md in this
# directory for why this exists instead of `supabase start`/`db reset`.
set -euo pipefail

DB_NAME="${1:-ridefinder_test}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -X -q)

# Every SQL file below is fed to psql via stdin redirection, not `-f
# <path>`, on purpose: `-f` makes the sudo'd postgres process open the file
# itself, which needs postgres to have traversal permission into the
# checkout directory. `< path` has the invoking (non-postgres) shell open
# it first and hand sudo the already-open fd, sidestepping that entirely --
# CI runners that lock down $HOME/work to the runner user (permission
# denied for postgres) still work this way.
echo "==> Recreating database $DB_NAME"
sudo -u postgres dropdb --if-exists "$DB_NAME"
sudo -u postgres createdb "$DB_NAME"

echo "==> Applying auth shim"
"${PSQL[@]}" -d "$DB_NAME" < "$SCRIPT_DIR/auth-shim.sql"

echo "==> Applying storage shim"
"${PSQL[@]}" -d "$DB_NAME" < "$SCRIPT_DIR/storage-shim.sql"

echo "==> Applying migrations"
for f in "$MIGRATIONS_DIR"/*.sql; do
  echo "  -- $(basename "$f")"
  "${PSQL[@]}" -d "$DB_NAME" < "$f"
done

echo "==> All migrations applied cleanly to $DB_NAME"
