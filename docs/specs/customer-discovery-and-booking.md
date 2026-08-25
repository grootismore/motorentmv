# Feature Specification: Customer Discovery & Booking Request

**Status**: ✅ Implemented & tested
**PRD Reference**: `docs/PRD.md` §1, §2, §3, §4

## Overview

Anonymous search and listing browse, an itemized quote, and a gated request-to-book submission — the customer-facing half of the booking lifecycle, up through `request_booking()`. The renter-facing accept/decline/handover half is `docs/specs/booking-lifecycle.md`.

## User Stories

1. As a customer, I want to search by location and date range and see only vehicles actually available for that window.
2. As a customer, I want to see an honest, itemized price (rate, subtotal, deposit, total) before I commit to anything.
3. As a customer, I want to request a booking without being charged — payment happens later, separately, and never through this app at request time.
4. As a customer, I can't submit a request without my license and ID already on file, and I want a clear reason why if I'm blocked.

## Acceptance Criteria

- [x] AC1: `search_available_vehicles(p_starts_at, p_ends_at, p_location?, p_category?, p_transmission?, p_max_daily_rate_laari?)` excludes any vehicle with an overlapping accepted booking or maintenance block, callable by `anon`.
- [x] AC2: `get_vehicle_listing(p_vehicle_id)` returns no row (not an error) for a vehicle that isn't currently available.
- [x] AC3: `get_listing_quote(p_vehicle_id, p_starts_at, p_ends_at)` returns the exact same itemized numbers `accept_booking()` will later freeze onto the booking (both call `compute_booking_quote()`).
- [x] AC4: `request_booking()` raises a clear, specific error if the customer has no verified-or-pending `license` + `id_card` document — enforced server-side, not just a client-side UX hint.
- [x] AC5: A conflict on request never leaks another customer's exact booking window (a fixed, non-leaking message replaces Postgres's own exclusion-violation detail).
- [x] AC6: The Explore → Search → Listing → Checkout flow works with `session === null` throughout, until the actual "Request booking" tap.

## Technical Design

### Architecture

`src/features/discovery/` (search/listing/quote queries) → `src/features/checkout/` (rider details form + submission) → `request_booking` RPC. `InlineAuthGate` renders in place of the checkout form when signed out, rather than a route redirect — this is what keeps browsing/quoting anonymous while still gating the one write that needs an identity.

### Data Models

`SearchVehicleResult` / `VehicleListing` / the quote's `jsonb` shape (`rate_type`, `rate_amount_laari`, `units`, `subtotal_laari`, `discount_laari`, `delivery_fee_laari`, `deposit_amount_laari`, `total_laari`, `computed_at`) — all defined by the RPCs themselves in `supabase/migrations/20260821150001_customer_discovery.sql` and `20260821140001_booking_pricing_and_guard_hardening.sql`; typed client-side in `src/lib/database.types.ts`.

### API Endpoints

```
rpc search_available_vehicles(...)   -- anon, authenticated
rpc get_vehicle_listing(p_vehicle_id)          -- anon, authenticated
rpc get_listing_quote(...)                     -- anon, authenticated
rpc is_vehicle_bookable(...)                   -- anon, authenticated (freshness re-check)
rpc request_booking(...)                       -- authenticated only
```

### Dependencies

- [x] Customer discovery SQL migration + RLS
- [x] Document-requirement gate (`docs/specs/documents.md`)

## Edge Cases

1. Search results go stale while a customer is browsing (another customer accepted the same window in the meantime) — handled by `is_vehicle_bookable()`'s courtesy re-check before enabling "Request booking"; the real concurrency-safe guarantee is still the database exclusion constraint at accept time, not this check.
2. `EXPO_PUBLIC_DEMO_MODE=true` with no Supabase configured — Explore/Search fall back to clearly-labeled, non-bookable demo cards rather than showing a raw "not configured" error; never substitutes for real data when real data exists.

## Testing Plan

- [x] `__tests__/app/(customer)/{explore,search,search.demo-fallback,checkout}.test.tsx` — screen/integration coverage, including the signed-out inline-auth-gate case.
- [x] `src/features/discovery/SearchForm.test.tsx`.
- [x] SQL suite: half-open overlap logic, boundary adjacency, non-leaking conflict message, document-gate enforcement (`supabase/local-dev/`).
- [ ] 📱 `.maestro/` search → request → renter accept flow — written, not run in this environment (`docs/ROADMAP.md` item 4).
