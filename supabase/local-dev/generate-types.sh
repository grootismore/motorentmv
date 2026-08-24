#!/usr/bin/env bash
# Regenerates src/lib/database.types.ts from the local scratch database's
# current schema. Run this after changing any migration.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="${1:-ridefinder_test}"
OUT_FILE="$SCRIPT_DIR/../../src/lib/database.types.ts"

# stdin redirection, not `-f` -- see run-migrations.sh's own comment on why.
sudo -u postgres psql -v ON_ERROR_STOP=1 -X -q -t -A -d "$DB_NAME" < "$SCRIPT_DIR/introspect.sql" \
  | node "$SCRIPT_DIR/generate-types.mjs" > "$OUT_FILE"

echo "Wrote $OUT_FILE"
