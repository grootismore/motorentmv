# MotoRent MV

Motorcycle rental operations and booking for Malé and Hulhumalé — Expo/React Native TypeScript app for iOS and Android.

**Phase 0** (engineering scaffold), the **database foundation** (Supabase
schema/RLS/migrations), and **auth + renter onboarding + fleet management**
are done. Customer booking is still a placeholder shell — see PRD Prompt 5.
See [`docs/architecture/0001-foundation-decisions.md`](./docs/architecture/0001-foundation-decisions.md)
for what was decided and why, and the PRD for what comes next.

## Stack

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript (strict)
- Expo Router (file-based navigation) + development builds (`expo-dev-client`)
- Zod for environment validation
- `@supabase/supabase-js` client boundary, typed against the generated schema — real auth (email OTP) and fleet CRUD are wired, inert only until `EXPO_PUBLIC_SUPABASE_*` point at a real project
- Supabase Postgres schema: 13 tables, RLS on every one, server-side booking-overlap protection, private vehicle-photo storage — see [Database](#database) below
- TanStack Query for server state, with an AsyncStorage cache persister for offline-read
- expo-image-picker + expo-image for vehicle photos
- ESLint (`eslint-config-expo`, flat config) + Prettier
- Jest (`jest-expo` preset) + React Native Testing Library

## Prerequisites

- Node.js 22+ and npm (`.npmrc` sets `engine-strict=true`, and
  `@supabase/auth-js`, pulled in transitively by `@supabase/supabase-js`,
  declares `"engines": { "node": ">=22.0.0" }` — `npm ci`/`npm install`
  hard-fail on Node 20)
- Xcode 26.4+ for iOS builds (Expo SDK 57's documented minimum; separately,
  `expo-modules-jsi/apple/Package.swift` declares `swift-tools-version: 6.2`,
  so any Xcode older than 26 fails the build outright at SwiftPM resolution)
  and/or Android Studio for Android emulator builds
- An Expo account + the [EAS CLI](https://docs.expo.dev/eas/) (`npm i -g eas-cli`) once you're building with EAS

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values as they become available
```

The app boots without `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`
set — `EXPO_PUBLIC_APP_ENV` defaults to `development` — but auth, org creation,
and fleet management all need a real Supabase project behind those two vars to
actually do anything; without them `getSupabase()` throws a clear "not
configured" error at the point of use rather than the app crashing at
startup. Apply every migration in `supabase/migrations/` (in order) to that
project before testing sign-in.

## Running

This app uses a **development build**, not Expo Go, because native modules
(`expo-dev-client`, and later `expo-notifications`/`expo-secure-store`) require one.

```bash
npx expo run:ios       # builds and launches a dev build on the iOS Simulator
npx expo run:android   # builds and launches a dev build on an Android emulator
npx expo start         # starts Metro once a dev build is installed
```

## Scripts

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test          # Jest
npm run format        # Prettier --write
npm run format:check  # Prettier --check
npm run verify        # format:check + lint + typecheck + test, in order
```

All four gates (`format:check`, `lint`, `typecheck`, `test`) pass as of this
commit.

## Project structure

```
app/                  Expo Router routes (file-based)
  (auth)/              Role selection, sign-in, verify — real Supabase OTP auth
  (customer)/          Customer tab experience — still shells only (Prompt 5)
  (renter)/            Onboarding (no org yet) or the renter tabs (org exists)
    fleet/              List, detail, create, edit — real Supabase CRUD
    more/staff.tsx       Staff invitation (placeholder-level, see Database below)
  (shared)/            Notifications, support, legal — shells only
__tests__/            Tests for files under app/ — Expo Router's require.context
                       sweeps every file under app/ into the bundle, so a
                       colocated *.test.tsx there breaks `expo export`/builds;
                       these mirror the app/ path they cover instead.
src/
  components/          ErrorBoundary, Screen, Button, TextField, ChipSelect,
                       LoadingState/EmptyState/ErrorState
  design-system/        tokens.ts, ThemeProvider
  features/
    auth/                AuthProvider (session restore), session.ts (OTP),
                         experience-intent.tsx + useAppGate (routing gate)
    organizations/        CreateOrganizationScreen, membership/invite queries
    fleet/                vehicle/rate/availability-block queries, photo
                         upload, VehicleForm + Rates/Photos/AvailabilityBlocks
                         sections
  lib/                  env.ts, supabase.ts, database.types.ts, query-client.ts,
                       query-persister.ts, result.ts
```

## App config and EAS

- `app.config.ts` — TypeScript app config. `ios.bundleIdentifier` / `android.package`
  are placeholders (`com.motorentmv.app`) — replace before any store submission or
  `eas init`. App name "MotoRent MV" is a working title per the PRD, pending
  branding validation.
- `eas.json` build profiles:
  - `development` — internal distribution, dev client, for physical devices
  - `development-simulator` — same, targeting the iOS Simulator
  - `preview` — internal distribution, production-like, for stakeholder testing
  - `production` — store-bound build

No EAS project is linked yet (`extra.eas.projectId` is unset) — run `eas init`
when ready to build.

## Auth, routing, fleet and bookings

- **Auth**: email OTP (a 6-digit code, not a magic link — see
  `src/features/auth/session.ts` for why) via Supabase Auth. `AuthProvider`
  restores the session on launch and stays in sync with
  `supabase.auth.onAuthStateChange` — nothing re-derives "am I signed in"
  itself.
- **Routing gate**: `useAppGate()` (`src/features/auth/useAppGate.ts`,
  decision table in `computeAppGate.ts`) is the single source of truth
  `app/_layout.tsx` and `app/index.tsx` both read: `loading` while the
  session/membership are resolving, `auth` when signed out, `renter` when an
  organization membership exists, `customer` otherwise (if that's the role
  the user picked on the role-select screen — tracked only as a UI hint in
  `experience-intent.tsx`, never as an authorization decision; real
  authorization is always server-side, see Database below). A signed-in
  renter with no organization yet sees `CreateOrganizationScreen` in place of
  the tab bar, rendered directly by `(renter)/_layout.tsx`.
- **Fleet**: `(renter)/fleet/` is full CRUD against the real schema —
  list/detail/create/edit, per-vehicle hourly/daily rates (via the
  `set_vehicle_rate` RPC, since a naive close-then-insert from the client
  could race), manual availability blocks, and photo upload/delete through
  the private `vehicle-photos` Storage bucket. Every mutation validates
  nothing client-side beyond form UX — the server/database is the actual
  authority (see "Enforce authorization on server/database" below).
- **Staff invitation is placeholder-level by design**: `invite_org_member_by_email`
  only adds someone who already has a MotoRent MV account (the schema's
  `organization_members.user_id` is `NOT NULL`) — there's no
  invite-by-email-before-signup flow yet. Inviting an unregistered email
  fails with a clear, distinguishable error rather than silently doing
  nothing.
- **Offline-read**: `PersistQueryClientProvider` persists the TanStack Query
  cache to AsyncStorage, so a previously loaded screen (e.g. the fleet list)
  still renders on next launch even with no connectivity (PRD §11). Anything
  backed by a signed URL (vehicle photos) opts out via
  `meta: { persist: false }` — a cached signed URL would just be expired.
- **Enforce authorization on server/database, treat client checks as UX
  only**: every table-level grant is scoped and column-restricted (see
  Database below), and every RPC re-implements its own authorization check
  rather than relying on the caller having done the right thing — a
  screen's disabled button or hidden section is a courtesy, not a boundary.
- **Booking engine**: `(renter)/today.tsx` (pickups/returns/active/overdue
  stats plus fleet status — deliberately no unpaid-amount stat, payments
  aren't built yet), `(renter)/calendar.tsx` (a lightweight agenda grouped
  by pickup date, not a calendar-grid library — see Known issues), and
  `(renter)/bookings/` (inbox list with a needs-action/upcoming/active/history
  filter, plus a detail screen). The detail screen shows a live quote
  preview (`compute_booking_quote`, same server-side rounding rule the
  eventual `accept_booking` call uses) before acceptance, the frozen
  `quote_snapshot` after, a conflict warning sourced only from
  `vehicle_busy_ranges`/`availability_blocks` (never another customer's
  booking row), and the eight state-machine actions
  (`src/features/bookings/ActionPanel.tsx`) wired straight to their RPCs —
  no client-side status field is ever written directly.

## Database

Schema lives in `supabase/migrations/` (25 ordered files) — profiles,
organizations, organization_members, vehicles, vehicle_rates,
availability_blocks, bookings, booking_events, inspections, transactions,
expenses, documents, notifications, a private `vehicle-photos` Storage
bucket + its `storage.objects` policies, and the helper functions/RPCs
that enforce the rules below at the database level, not just in
application code.

- **Money**: every amount is an integer `*_laari` column (1 MVR = 100 laari),
  never floating point.
- **Time**: every timestamp is `timestamptz` (UTC); display formatting to
  `Indian/Maldives` is an application concern, not a storage one.
- **Overlap protection**: a GiST exclusion constraint makes two
  accepted/ready/active bookings for the same vehicle over overlapping ranges
  impossible to commit — enforced by Postgres itself, not application logic.
  Bounds are half-open (`'[)'`, matching `vehicle_rates`'s existing
  convention) so a booking ending at 14:00 and one starting at 14:00 for the
  same vehicle are correctly treated as back-to-back, not overlapping — an
  earlier closed-bound (`'[]'`) version of this constraint would have
  falsely rejected that case (see `supabase/tests/05_booking_engine.sql`).
  A paired trigger + advisory lock closes the one gap a single-table
  exclusion constraint can't cover: a booking vs. a maintenance
  (`availability_blocks`) entry.
- **Pricing**: `compute_booking_quote()` picks hourly vs. daily by duration
  (24h+ bills daily, rounding any partial day up to a full day; shorter
  bills hourly, rounding any partial hour up to a full hour) from the
  vehicle's live `vehicle_rates`, never a client-supplied number.
  `compute_booking_policy_snapshot()` reads the organization's current
  `policies` jsonb. Both are called only from inside `accept_booking()` —
  see Idempotency below for why they're not parameters.
- **Idempotency**: `transition_booking_status()` (called only through the
  eight named wrappers — `request_booking`, `accept_booking`,
  `decline_booking`, `mark_booking_needs_info`, `ready_booking`,
  `activate_booking`, `complete_booking`, `cancel_booking`) short-circuits
  to a no-op when a booking is already at the target status, so a retried
  network call never double-writes an audit event or errors as an "invalid
  transition." `accept_booking` no longer takes quote/policy/total
  parameters at all (a Prompt 2 gap: whoever could call the RPC controlled
  the accepted price) — they're computed server-side, from the vehicle's
  actual rates, at the instant of acceptance. Booking creation is
  idempotent too: a partial unique index plus a check-then-insert-or-return
  in `request_booking()` means a retried "request" tap returns the existing
  open request instead of creating a duplicate.
- **Immutability**: a booking's `quote_snapshot`/`policy_snapshot` can never
  change once set (trigger-enforced), and neither can its `starts_at`/
  `ends_at` once it's left draft/requested — a direct client UPDATE that
  changed dates on a confirmed booking could otherwise hit the exclusion
  constraint and surface Postgres's own conflict detail, which names the
  other booking's exact date range. Corrections are new `transactions`
  rows, not snapshot edits.
- **Non-leaking conflict errors**: the one case that really could expose
  another customer's booking window — the bookings table's own GiST
  exclusion constraint rejecting an accept/ready/activate — is caught in
  `transition_booking_status()` and replaced with a fixed, non-leaking
  message (PRD §6.4); verified in `05_booking_engine.sql` by asserting on
  the exact message text, not just that an error was raised.
- **Audit trail**: `booking_events` is insert-only, written by
  `transition_booking_status()` for every status change and by a
  dedicated `AFTER INSERT` trigger for a booking's own creation (a Prompt 2
  gap — a fresh INSERT previously left the timeline starting mid-story) —
  no client has a direct write grant to it either way.
- **RLS**: every table has row-level security enabled, keyed off
  `auth.uid()` via `is_org_member()`/`has_org_role()`, never a client-supplied
  organization id. Financial tables (`transactions`, `expenses`) default to
  owner/manager visibility only, matching the PRD's "staff permissions must
  be explicit." A narrow `profiles` policy lets an org member see the
  profile (name/phone/email) of a customer who has a booking with their
  organization — needed for the booking inbox — without granting any
  broader cross-user visibility.

### Running it locally

The full Supabase CLI local stack (`supabase start`) needs Docker, which
isn't available in every environment (including the one this was built in).
`supabase/local-dev/` is a stand-in harness that runs the same migrations
against a plain Postgres instance instead — see its README for how each
piece works. Once Docker is available, prefer the real thing.

```bash
# Requires a local PostgreSQL 16 server (e.g. `pg_ctlcluster 16 main start`)
bash supabase/local-dev/run-tests.sh          # migrations -> seed -> RLS/overlap test suite
bash supabase/local-dev/generate-types.sh     # regenerate src/lib/database.types.ts
```

`run-tests.sh` proves, with real assertions (not just "it compiles"): tenant
isolation, customer ownership, owner/manager-vs-staff financial visibility
and role-escalation restrictions, vehicle-photo storage scoping (draft vs.
available vehicles) plus every RPC's authorization checks, the booking
engine (`05_booking_engine.sql` — half-open boundary adjacency, time-zone
equivalence, hourly/daily rounding at exact and partial-unit boundaries,
idempotent cancel/accept, and that a genuine overlap is rejected with a
non-leaking message), and — via two genuinely concurrent psql sessions —
that exactly one of two simultaneous accept attempts on overlapping
bookings ever succeeds. The storage half of that runs against
`supabase/local-dev/storage-shim.sql`, a minimal
`storage.buckets`/`storage.objects` stand-in — same reasoning as the auth
shim, see that file's header comment.

## Known, accepted issues

- `npm audit` reports a moderate `uuid` advisory nested under Expo's own CLI/build
  tooling (`@expo/config-plugins` → `xcode` → `uuid`). This is a build-time
  dependency, never bundled into the app, and the only fix npm offers is a
  breaking downgrade to `expo@46`. Left as-is; revisit when upstream updates.
- `expo-doctor`'s two network-dependent checks (Expo config schema validation
  against a remote schema, and React Native Directory package metadata) fail in
  network-restricted environments. The other 19/21 checks pass. `app.config.ts`
  was independently validated locally via `expo config --type public`.
- `jest-expo@57.0.4`'s own transitive dependencies (`jest-environment-jsdom`,
  `@jest/globals`) are still on the Jest 29 line, so the project pins `jest` and
  `@types/jest` to `^29.7.0`/`^29.5.0` rather than the Jest 30 that `expo install`
  resolves by default — installing Jest 30 here causes a version-skewed
  `jest-mock` (nested vs. hoisted) and Jest crashes at the first test run.
- `.npmrc` sets `legacy-peer-deps=true`. `expo-router`'s optional web-preview
  dependencies (`@expo/ui`, `vaul`, `@radix-ui/*`) pin an exact `react-dom` patch
  that conflicts with npm's default (strict) peer resolution on a pure
  native project. This is a known ecosystem issue, not a project-specific bug.
- `supabase gen types typescript --db-url` shells out to Docker on this CLI
  version even with an explicit connection string, which isn't available in
  every environment. `src/lib/database.types.ts` is instead generated by
  `supabase/local-dev/generate-types.sh`, a small introspection query + Node
  script — functionally equivalent for this schema, but not byte-identical
  to the CLI's own output (`Functions` is hand-written rather than
  introspected, though it does now include a real `Relationships` array per
  table).
- Real Supabase Auth (email OTP delivery, a live session round-trip) can't be
  exercised end-to-end without a live Supabase project, which doesn't exist
  in this sandbox. `src/features/auth/session.ts` is written against the
  real `@supabase/supabase-js` Auth API and unit-tested with a mocked
  client; the two new RPCs it depends on indirectly (`invite_org_member_by_email`,
  `set_vehicle_rate`) are proven against the local Postgres harness instead.
- Availability-block dates use a plain `YYYY-MM-DD HH:mm` text field
  (`src/features/fleet/AvailabilityBlocksSection.tsx`) rather than a native
  date/time picker, to avoid a new dependency for a Prompt-3-scoped feature.
  Functionally complete and validated, just not the eventual UX.
- Expo Router's `require.context` sweeps every file under `app/` into the
  bundle regardless of whether it's a valid route, so a colocated
  `*.test.tsx` there breaks `expo export`/production builds (confirmed:
  `@testing-library/react-native`'s Node-only `console` import doesn't
  resolve for the RN platform). Tests for files under `app/` live in a
  mirrored `__tests__/app/` tree instead — see Project structure above.
- No iOS Simulator or Android Emulator is available in this sandbox (no
  Xcode/Android SDK). Verification here is `expo export --platform ios`
  and `--platform android` (both bundle cleanly, 1378/1466 modules) plus
  the full unit/component/RLS test suites — not an on-device or
  in-simulator run. Real device/simulator verification is still needed
  before treating this as done.
- `(renter)/calendar.tsx` is a lightweight agenda (bookings grouped by
  pickup date), not a calendar-grid view — no date/calendar library was
  added for it, per the same "prefer Expo-supported packages, avoid
  unnecessary native dependencies" constraint as Prompt 0. A grid view can
  replace it later without changing the data underneath.
- `overdue` is a real `booking_status` enum value but nothing writes it:
  there's no scheduled-job runner in this sandbox to flip an `active`
  booking automatically once its return time passes. The UI computes
  "overdue" for display (an active booking whose `ends_at` is in the past)
  without changing the stored status; wiring an actual scheduled transition
  (e.g. `pg_cron` or an Edge Function on a timer) is future-phase work.
- An org member can decline or cancel a `needs_info` booking but not accept
  it directly — the state machine only allows `needs_info → requested` (the
  customer resubmitting), and there's no customer app yet to do that from
  (PRD Prompt 5). The RPC (`request_booking`) and the transition itself
  already support it; only the customer-facing UI is missing.
- The iOS CI workflow pins `runs-on: macos-26` because Expo SDK 57 needs
  Xcode 26.4+ / Swift 6.2. `macos-14` (whose newest Xcode is 16.2) fails
  twice over: RN 0.86's Podfile rejects Xcode < 16.1, and `expo-modules-jsi`
  then fails SwiftPM resolution with "package 'apple' is using Swift tools
  version 6.2.0 but the installed version is 6.0.0". Both were confirmed by
  real runs. The workflow discovers and selects the newest Xcode on whatever
  runner it lands on rather than hardcoding a path, and its `runner` input
  allows overriding the label from the Run workflow dialog if GitHub's image
  lineup changes again.

## CI: unsigned iOS device IPA

`.github/workflows/ios-unsigned-ipa.yml` builds an **unsigned** arm64
device IPA for sideloading (Sideloadly/AltStore re-sign it at install
time — it cannot be installed as-is). It runs on manual dispatch and on
pushes to the working branch that touch app source. No Apple certificates,
provisioning profiles, device UDIDs or EAS signing are involved anywhere:
`CODE_SIGNING_ALLOWED=NO` makes signing impossible rather than skipped.

Before packaging, it verifies the built `.app` is genuinely a device
build — products directory, `CFBundleSupportedPlatforms`, the Mach-O
build-version platform, an arm64-only slice, a matching bundle id, and
that Hermes and ExpoModulesCore are actually present — and fails without
producing an artifact if any check does not hold.

## What's next

Customer discovery and the customer-side booking flow (Prompt 5 — the
`request_booking` RPC and customer-facing RLS policies already exist from
this and earlier prompts; Prompt 5 adds the customer app screens),
handover/payments/notifications (Prompt 6), finance/reports (Prompt 7),
CI/EAS automation (Prompt 8), and the release-candidate/pilot handoff
(Prompt 9) — see the PRD for full scope per phase.
