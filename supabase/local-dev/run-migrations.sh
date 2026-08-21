#!/usr/bin/env bash
# Recreates a scratch database and applies the auth shim + every migration
# in supabase/migrations/, in filename order. See README.md in this
# directory for why this exists instead of `supabase start`/`db reset`.
set -euo pipefail

DB_NAME="${1:-motorentmv_test}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -X -q)

echo "==> Recreating database $DB_NAME"
sudo -u postgres dropdb --if-exists "$DB_NAME"
sudo -u postgres createdb "$DB_NAME"

echo "==> Applying auth shim"
"${PSQL[@]}" -d "$DB_NAME" -f "$SCRIPT_DIR/auth-shim.sql"

echo "==> Applying migrations"
for f in "$MIGRATIONS_DIR"/*.sql; do
  echo "  -- $(basename "$f")"
  "${PSQL[@]}" -d "$DB_NAME" -f "$f"
done

echo "==> All migrations applied cleanly to $DB_NAME"
