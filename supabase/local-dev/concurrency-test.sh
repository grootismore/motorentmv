#!/usr/bin/env bash
# Proves "no double-booking under concurrent requests" (PRD NFR, §11):
# two org-member sessions simultaneously try to accept two different
# *already-requested* bookings for the same vehicle over overlapping
# ranges. Exactly one must succeed; the other must be rejected by the
# exclusion constraint on bookings, not by luck of statement ordering.
set -euo pipefail

DB_NAME="${1:-motorentmv_test}"
PSQL_SUPER=(sudo -u postgres psql -v ON_ERROR_STOP=1 -X -q -d "$DB_NAME")
PSQL_T=(sudo -u postgres psql -X -q -t -A -d "$DB_NAME")

OWNER_ID="90000000-0000-0000-0000-000000000090"
CUSTOMER_ID="90000000-0000-0000-0000-000000000091"

"${PSQL_SUPER[@]}" <<SQL
insert into auth.users (id, email) values
  ('$OWNER_ID', 'concurrency-owner@example.com'),
  ('$CUSTOMER_ID', 'concurrency-customer@example.com')
on conflict do nothing;
insert into public.profiles (id, email) values
  ('$OWNER_ID', 'concurrency-owner@example.com'),
  ('$CUSTOMER_ID', 'concurrency-customer@example.com')
on conflict do nothing;
SQL

ORG_ID=$("${PSQL_T[@]}" -c "
  select set_config('request.jwt.claims', json_build_object('sub','$OWNER_ID','role','authenticated')::text, false);
  set role authenticated;
  insert into public.organizations (name, slug) values ('Concurrency Org', 'concurrency-org-test') returning id;
" | tail -1)

VEHICLE_ID=$("${PSQL_T[@]}" -c "
  select set_config('request.jwt.claims', json_build_object('sub','$OWNER_ID','role','authenticated')::text, false);
  set role authenticated;
  insert into public.vehicles (organization_id, registration_number, status) values ('$ORG_ID', 'RACE-001', 'available') returning id;
" | tail -1)

BOOKING_1=$("${PSQL_T[@]}" -c "
  select set_config('request.jwt.claims', json_build_object('sub','$CUSTOMER_ID','role','authenticated')::text, false);
  set role authenticated;
  insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
  values ('$ORG_ID', '$VEHICLE_ID', '$CUSTOMER_ID', 'requested', now() + interval '20 day', now() + interval '21 day')
  returning id;
" | tail -1)

BOOKING_2=$("${PSQL_T[@]}" -c "
  select set_config('request.jwt.claims', json_build_object('sub','$CUSTOMER_ID','role','authenticated')::text, false);
  set role authenticated;
  insert into public.bookings (organization_id, vehicle_id, customer_id, status, starts_at, ends_at)
  values ('$ORG_ID', '$VEHICLE_ID', '$CUSTOMER_ID', 'requested', now() + interval '20 day 12 hour', now() + interval '21 day 12 hour')
  returning id;
" | tail -1)

echo "  org=$ORG_ID vehicle=$VEHICLE_ID booking_1=$BOOKING_1 booking_2=$BOOKING_2 (overlapping ranges)"

run_accept() {
  local booking_id="$1"
  local out_file="$2"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -X -q -d "$DB_NAME" > "$out_file" 2>&1 <<SQL
select set_config('request.jwt.claims', json_build_object('sub','$OWNER_ID','role','authenticated')::text, false);
set role authenticated;
begin;
select (public.transition_booking_status('$booking_id', 'accepted', '{"total_laari": 10000}'::jsonb, '{}'::jsonb, 10000)).status;
select pg_sleep(1.5);
commit;
SQL
}

OUT_1=$(mktemp)
OUT_2=$(mktemp)

# Launched together; the second call's advisory lock wait (inside
# bookings_guard()) is what actually forces the two to serialize rather
# than both racing to an inconsistent result.
run_accept "$BOOKING_1" "$OUT_1" &
PID_1=$!
sleep 0.2
run_accept "$BOOKING_2" "$OUT_2" &
PID_2=$!

set +e
wait $PID_1; RC_1=$?
wait $PID_2; RC_2=$?
set -e

echo "  -- process 1 (booking_1) exit=$RC_1"
sed 's/^/     /' "$OUT_1"
echo "  -- process 2 (booking_2) exit=$RC_2"
sed 's/^/     /' "$OUT_2"

SUCCESS_COUNT=0
[[ $RC_1 -eq 0 ]] && SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
[[ $RC_2 -eq 0 ]] && SUCCESS_COUNT=$((SUCCESS_COUNT + 1))

FINAL_STATUSES=$("${PSQL_T[@]}" -c "
  select string_agg(status::text, ',' order by starts_at) from public.bookings where id in ('$BOOKING_1', '$BOOKING_2');
")
echo "  final statuses: $FINAL_STATUSES"

rm -f "$OUT_1" "$OUT_2"

if [[ "$SUCCESS_COUNT" -ne 1 ]]; then
  echo "FAIL: expected exactly one of the two concurrent accept attempts to succeed, got $SUCCESS_COUNT"
  exit 1
fi

if [[ "$FINAL_STATUSES" != "accepted,requested" && "$FINAL_STATUSES" != "requested,accepted" ]]; then
  echo "FAIL: expected exactly one booking accepted and the other still requested, got: $FINAL_STATUSES"
  exit 1
fi

echo "  ok: exactly one concurrent accept succeeded, the other was correctly rejected"
