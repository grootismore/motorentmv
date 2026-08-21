#!/usr/bin/env bash
# Full local verification: fresh migrations -> seed -> SQL assertion
# suite -> concurrency test. See README.md in this directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$SCRIPT_DIR/.."
DB_NAME="motorentmv_test"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -X -q -d "$DB_NAME")

bash "$SCRIPT_DIR/run-migrations.sh" "$DB_NAME"

echo "==> Applying seed data"
"${PSQL[@]}" -f "$SUPABASE_DIR/seed.sql"

echo "==> Applying test helpers"
"${PSQL[@]}" -f "$SUPABASE_DIR/tests/00_helpers.sql"

echo "==> Running SQL assertion suite"
for f in "$SUPABASE_DIR"/tests/[0-9][0-9]_*.sql; do
  [[ "$(basename "$f")" == "00_helpers.sql" ]] && continue
  echo "  -- $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done

echo "==> Running concurrency test (two simultaneous accept attempts on overlapping ranges)"
bash "$SCRIPT_DIR/concurrency-test.sh" "$DB_NAME"

echo "==> All migrations, seed data and tests passed"
