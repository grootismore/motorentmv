# Product Requirements Document: RideFinder

**Status**: Living document, written from an audit of the implemented codebase (this document describes the product _as built_, not a pre-development spec). Last updated 2026-08-25.

## Executive Summary

RideFinder is a motorcycle rental marketplace and operations app for Malé and Hulhumalé, Maldives, built with Expo SDK 57 / React Native 0.86 for iOS and Android, backed by Supabase (Postgres + RLS + Storage). One app, two experiences: a **customer** side (browse, request, track a rental) and a **renter** side (the rental business's fleet, bookings, and back office).

## Problem Statement

A motorcycle rental business in Malé/Hulhumalé needs to list its fleet, take booking requests, verify renter documents, collect a deposit, hand over and return vehicles with a paper trail, and track its own finances — without adopting a full point-of-sale system. A visiting or resident customer needs to find an available bike for specific dates, see an honest price up front, and request it without creating an account just to look.

## Target Users

- **Primary — customer**: someone who wants to rent a motorcycle for a date range, browsing anonymously until they're ready to commit to a request.
- **Primary — renter**: the rental business's staff (owner, manager, or staff role), managing the fleet, responding to requests, handling handover/return, and tracking payments.

## Legend: status classification

Every feature below is tagged with exactly one of:

| Tag                                         | Meaning                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ **Implemented & tested**                 | Real code, exercised by an automated test that passes in CI (Jest unit/component/integration, or the SQL/RLS suite against a real Postgres instance).                                                                                                                                                                           |
| 📱 **Implemented, needs device validation** | Real code, typechecks and bundles cleanly (`expo export`), but its actual on-screen behavior depends on native device/simulator rendering (native tab bar, camera/photo picker, haptics, push delivery) that this development environment cannot run — see "Environment constraints" below. |
| 🚧 **Incomplete**                           | Partially built — a documented, specific gap remains.                                                                                                                                                                                                                                                                           |
| 📋 **Planned**                              | Not started; scoped for a future phase.                                                                                                                                                                                                                                                                                         |

A feature is never marked unbuilt merely because it can't be _visually confirmed_ here — code that exists, compiles, and passes its tests is ✅ or 📱, not 🚧.

### Environment constraints

This repository has been developed in a Linux CI-style container with no iOS Simulator, no Android Emulator, and no physical device attached. Verification here means: `npm run typecheck`, `npm run lint`, `npm run format:check`, the Jest suite (`npm test`), a real `expo export` bundle build, and the local Postgres RLS/booking-engine SQL suite. The GitHub Actions workflow `ios-unsigned-device.yml` produces a real, installable (unsigned) device build on a macOS runner with Xcode — that is the actual on-hardware verification path, run in CI, not in this environment.

## Core Features

### 1. Anonymous browsing, gated sign-in — ✅ Implemented & tested

Customers can search, view listings, and see an itemized quote with no account. Sign-in is required only when submitting a booking request.

- Acceptance criteria:
  - [x] `search_available_vehicles`, `get_vehicle_listing`, `get_listing_quote` RPCs are callable by `anon` (granted in migrations, covered by `customer-discovery` SQL tests).
  - [x] Explore/Search/Listing screens render and query without a session (`explore.test.tsx`, `search.test.tsx`).
  - [x] An inline sign-in gate (not a route redirect) appears only at the request-submission step (`checkout.test.tsx`'s "shows the inline auth gate... when signed out").
- Evidence: `supabase/migrations/20260821150001_customer_discovery.sql`; `src/features/auth/InlineAuthGate.tsx`; `__tests__/app/(customer)/{explore,search,checkout}.test.tsx`.

### 2. Request-to-book workflow (booking state machine) — ✅ Implemented & tested

A request lands in the renter's inbox for accept/decline, not an instant booking. Full lifecycle: `draft → requested → accepted/declined/needs_info → ready → active → completed`, plus `cancelled` and `no_show`, each a named RPC.

- Acceptance criteria:
  - [x] Every transition is a dedicated RPC (`request_booking`, `accept_booking`, `decline_booking`, `mark_booking_needs_info`, `ready_booking`, `activate_booking`, `complete_booking`, `cancel_booking`, `mark_booking_no_show`) — no client-side status writes.
  - [x] Invalid transitions are rejected server-side (`booking_status_transitions` table + `transition_booking_status()`'s validation).
  - [x] Every transition is idempotent (safe to retry on a dropped network response) — SQL-tested.
  - [x] Pricing/policy are computed server-side at acceptance (`compute_booking_quote`, `compute_booking_policy_snapshot`) and frozen onto the booking (`bookings_guard()` blocks post-acceptance edits).
- Evidence: `supabase/migrations/20260821120011_bookings.sql` through `20260821190001_booking_no_show.sql`; `src/features/bookings/status.ts` (+ `status.test.ts`); `__tests__/app/(renter)/bookings/[bookingId].test.tsx`.

### 3. Document and deposit requirements, enforced server-side — ✅ Implemented & tested

A customer can't submit (or resubmit after `needs_info`) a request without a license and ID/passport photo on file. If the vehicle carries a refundable deposit, at least that much must be recorded as paid before the renter can mark the booking `active`.

- Acceptance criteria:
  - [x] `request_booking()` raises server-side if the customer has no verified-or-pending license + ID document.
  - [x] `activate_booking()` raises server-side if the recorded deposit is short.
  - [x] Both gates live in the same RPCs that enforce the rest of the state machine — no separate client-side bypass path.
- Evidence: `supabase/migrations/20260821220001_booking_requirements.sql`; `src/features/documents/queries.ts`'s `hasRequiredDocuments` (+ `queries.test.ts`).

### 4. Real-time availability — ✅ Implemented & tested

Search excludes any vehicle with an overlapping accepted booking or manual maintenance block, using correct half-open time-range logic (back-to-back bookings never falsely collide).

- Acceptance criteria:
  - [x] A Postgres GiST exclusion constraint on `bookings` prevents double-booking at the database level, not just in application code.
  - [x] Boundary-adjacency (one booking ending exactly when another starts) is allowed, SQL-tested.
  - [x] Two genuinely concurrent accept attempts on overlapping bookings: exactly one succeeds — SQL-tested with real concurrent sessions.
- Evidence: `supabase/migrations/20260821120013_booking_overlap_and_transitions.sql`; `supabase/local-dev/`'s SQL test suite (run in CI's `database_tests` job).

### 5. Fleet management — ✅ Implemented & tested (screens) / 📱 needs device validation (photo capture)

Full CRUD for vehicles, per-vehicle hourly/daily rates, manual availability blocks, and photo uploads.

- Acceptance criteria:
  - [x] Create/edit/list/detail screens exist and are tested (`VehicleForm.test.ts`).
  - [x] Fleet list shows real cover-photo thumbnails for signed-in renters (`useVehicleCoverPhotos`).
  - [ ] 📱 Actual camera/photo-library capture and upload flow — code exists (`src/lib/uploads.ts`, `expo-image-picker`), permission strings are declared, but the native picker UI itself needs a device to confirm.
- Evidence: `app/(renter)/fleet/**`; `supabase/migrations/20260821120008_vehicles.sql`, `20260821120009_vehicle_rates.sql`, `20260821130001_vehicle_photo_storage.sql`.

### 6. Manual availability blocks — ✅ Implemented & tested

Renter-set maintenance/unavailability windows on a vehicle, distinct from a booking, excluded from search the same way a booking is.

- Evidence: `supabase/migrations/20260821120010_availability_blocks.sql`.

### 7. Pickup/return inspections — ✅ Implemented & tested (form logic) / 📱 needs device validation (photo capture)

A structured checklist (odometer, fuel/battery, condition notes, before/after photos) at both ends of a rental. Lifecycle gates block starting or completing a booking without one on file.

- Acceptance criteria:
  - [x] `InspectionForm`/`InspectionSummary`/`InspectionSection` are tested (`InspectionForm.test.tsx`, `InspectionSummary.test.tsx`, `InspectionSection.test.tsx`).
  - [x] Server-side lifecycle gate exists (`20260821160001_inspections_lifecycle.sql`).
  - [ ] 📱 Before/after photo capture itself needs a device.
- Evidence: `src/features/inspections/`; `supabase/migrations/20260821120014_inspections.sql`, `20260821160001_inspections_lifecycle.sql`.

### 8. Manual payment ledger — ✅ Implemented & tested

Cash, bank transfer, or an external reference. No card data is collected or stored anywhere in this app.

- Acceptance criteria:
  - [x] Ledger entries write via a guarded path (`20260821160002_payments_ledger_guard.sql`), not a raw insert.
  - [x] `PaymentLedger.test.tsx` covers entry recording and the deposit-status display.
- Evidence: `src/features/payments/`; `supabase/migrations/20260821120015_transactions.sql`, `20260821160002_payments_ledger_guard.sql`.

### 9. Finance tracking — ✅ Implemented & tested

Manual payment ledger plus standalone income (owner/manager-only) and expenses, a month-navigable finance report by income source/expense category, and a line-item CSV export via the native share sheet.

- Acceptance criteria:
  - [x] `record-income.test.tsx`, `reports.test.tsx`, `csv.test.ts`, `queries.test.ts` all pass.
  - [x] Standalone income is schema-distinct from booking payments (`20260821200001_transactions_standalone_income.sql`).
  - [ ] 📱 The native share sheet invocation itself (`expo-sharing`) needs a device to confirm the OS sheet actually appears with the right file.
- Evidence: `src/features/finance/`; `app/(renter)/finance/**`.

### 10. Fleet maintenance log — ✅ Implemented & tested

A queryable service history per vehicle (description, cost, odometer), separate from the payment ledger.

- Evidence: `supabase/migrations/20260821180001_vehicle_maintenance_records.sql`; `src/features/fleet/MaintenanceSection.test.tsx`.

### 11. Customer profile and documents — ✅ Implemented & tested (logic) / 📱 needs device validation (upload UI)

Editable name/phone, plus license/ID photo uploads private to the uploading customer alone (not even the renting organization can see them), persisting across every future booking.

- Acceptance criteria:
  - [x] RLS scopes `documents` (profile-linked rows) to the uploader only (`20260821210001_customer_documents_storage.sql`).
  - [x] `profile.test.tsx`, `DocumentsSection.test.tsx`, `documents/queries.test.ts` all pass.
  - [ ] 📱 The actual camera/photo-library picker UI needs a device.
- Evidence: `app/(customer)/(tabs)/profile/`; `src/features/documents/`.

### 12. Notifications — ✅ Implemented & tested (data layer + UI logic) / 📱 needs device validation (push delivery)

In-app and push notifications on every booking status change, inspection record, and payment entry, deep-linking to the relevant booking. The renter's own note (why a request was declined, etc.) shows inline; unread counts and bulk "mark all read" work on both sides.

- Acceptance criteria:
  - [x] Server-side fan-out trigger writes a `notifications` row on every relevant event (`20260821160003_notifications_fanout.sql`).
  - [x] `notifications.test.tsx`, `queries.test.ts`, `service.test.ts` all pass.
  - [ ] 📱 Real push delivery to a device (no EAS project linked yet) — local notification scheduling and the deep-link handler are code-complete but unverified on hardware.
- Evidence: `src/features/notifications/`; `app/(shared)/notifications.tsx`.

### 13. Native navigation and controls — ✅ Implemented & tested

Both tab bars use Expo Router's native tabs (`UITabBarController` / Material bottom-nav). Every translucent surface (`GlassSurface`) renders through `expo-blur`'s real native `BlurView` on iOS, with an opaque fallback on Android/Reduce-Transparency. `Button`, `TextField`, and `GroupedSection` are plain, themed React Native views — not `@expo/ui`'s SwiftUI/Jetpack Compose components, after two independent `@expo/ui` attempts both regressed on a real device (Button ignoring brand color, GroupedSection content going blank) and the second round's screenshots showed the same bugs still present even after the first round's source-level fix. `@expo/ui` was permanently removed rather than attempted a third time, since this environment has no way to verify its on-screen behavior at all — see `docs/specs/native-ui-and-design-system.md`'s "Why not `@expo/ui`" for the full record.

- Acceptance criteria:
  - [x] Typechecks, lints, formats, bundles cleanly (`expo export`, both platforms).
  - [x] `Button`, `TextField`, `GroupedSection`, `GlassSurface` are covered by Jest tests asserting real rendered output.
  - [x] Tab bar and blur surface use genuinely native platform APIs; `Button`/`TextField`/`GroupedSection` are not on `AGENTS.md`'s list of controls that must be native.
- Evidence: `src/components/{Button,TextField,GroupedSection,GlassSurface}.tsx`; `docs/specs/native-ui-and-design-system.md`; `README.md`'s "Known limitations".

### 14. App-gate role routing — ✅ Implemented & tested

A signed-out user with no chosen role sees role-select; choosing "Rent a motorcycle" goes straight to browsing; choosing "Manage a rental business" goes to sign-in. A signed-in user's real organization membership always wins over the one-time role choice. An ambiguous case (signed in, no org, no known intent) re-asks rather than assuming either role.

- Acceptance criteria:
  - [x] `computeAppGate.test.ts` covers every branch of the decision table, including the "re-ask, don't assume renter" fix.
  - [x] The chosen intent persists across app restarts (`AsyncStorage`-backed, not in-memory only).
- Evidence: `src/features/auth/{computeAppGate,experience-intent,useAppGate}.ts`.

## Non-Functional Requirements

- **Money**: always an integer `*_laari` column (1 MVR = 100 laari), never floating point.
- **Time**: always `timestamptz` (UTC) in storage; every screen displays Indian/Maldives time (UTC+5, no DST).
- **Accessibility**: minimum 44pt touch targets; status is never color-alone (paired with a label/icon); Reduce Transparency and Reduce Motion are both respected.
- **Security**: row-level security on every table; financial tables default to owner/manager-only visibility; no card data collected or stored anywhere in this app; the anon key is safe to ship by Supabase's own design (RLS, not key secrecy, is the boundary).
- **Idempotency**: every state-transition and booking-creation RPC is safe to retry.

## Out of Scope (current phase)

- Card payments / any payment processor integration (deliberate — manual ledger only).
- A dual-role (customer + renter) in-app mode switcher — a signed-in user who is both must sign out and re-choose.
- Automated "overdue" status flipping (computed for display only; see `docs/specs/booking-lifecycle.md`).
- Real EAS-linked push delivery, Realtime subscriptions, offline write queueing.

## Related Documents

- `docs/ARCHITECTURE.md` — technical architecture and key decisions.
- `docs/ROADMAP.md` — what's next, by priority.
- `docs/specs/` — per-feature specifications with detailed acceptance criteria.
- `docs/tasks/status-board.md` — the consolidated status table.
- `docs/architecture/0001-foundation-decisions.md` — the original Phase 0 scaffolding ADR (historical; superseded by the features it once deferred, kept as a record).
- `README.md` — the canonical, always-current feature list and "Known limitations" section; this PRD cross-references it rather than duplicating it verbatim.
