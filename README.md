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

- Node.js 20+ and npm
- Xcode (iOS simulator builds) and/or Android Studio (Android emulator builds) for local native runs
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

## Auth, routing and fleet

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
  Database below), and both RPCs re-implement their own authorization check
  rather than relying on the caller having done the right thing — a
  screen's disabled button or hidden section is a courtesy, not a boundary.

## Database

Schema lives in `supabase/migrations/` (21 ordered files) — profiles,
organizations, organization_members, vehicles, vehicle_rates,
availability_blocks, bookings, booking_events, inspections, transactions,
expenses, documents, notifications, a private `vehicle-photos` Storage
bucket + its `storage.objects` policies, and the helper functions/RPCs
(including `invite_org_member_by_email` and `set_vehicle_rate`, added
alongside the auth/fleet UI that needed them) that enforce the rules below
at the database level, not just in application code.

- **Money**: every amount is an integer `*_laari` column (1 MVR = 100 laari),
  never floating point.
- **Time**: every timestamp is `timestamptz` (UTC); display formatting to
  `Indian/Maldives` is an application concern, not a storage one.
- **Overlap protection**: a GiST exclusion constraint makes two
  accepted/ready/active bookings for the same vehicle over overlapping ranges
  impossible to commit — enforced by Postgres itself, not application logic.
  A paired trigger + advisory lock closes the one gap a single-table
  exclusion constraint can't cover: a booking vs. a maintenance
  (`availability_blocks`) entry.
- **Immutability**: a booking's `quote_snapshot`/`policy_snapshot` can never
  change once set (trigger-enforced) — corrections are new `transactions`
  rows, not edits.
- **Audit trail**: `booking_events` is insert-only, and only ever written by
  `transition_booking_status()` (the sole path for changing a booking's
  status) — no client has a direct write grant to it.
- **RLS**: every table has row-level security enabled, keyed off
  `auth.uid()` via `is_org_member()`/`has_org_role()`, never a client-supplied
  organization id. Financial tables (`transactions`, `expenses`) default to
  owner/manager visibility only, matching the PRD's "staff permissions must
  be explicit."

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
available vehicles) plus both RPCs' authorization checks, and — via two
genuinely concurrent psql sessions — that exactly one of two simultaneous
accept attempts on overlapping bookings ever succeeds. The storage half of
that runs against `supabase/local-dev/storage-shim.sql`, a minimal
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
  to the CLI's own output (no `Relationships` array, and `Functions` is
  hand-written for the one RPC rather than introspected).
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
  and `--platform android` (both bundle cleanly, 1368/1456 modules) plus
  the full unit/component/RLS test suites — not an on-device or
  in-simulator run. Real device/simulator verification is still needed
  before treating this as done.

## What's next

The availability calendar and booking engine (Prompt 4 — the state
machine, overlap protection and `transition_booking_status` RPC already
exist from the database-foundation work; Prompt 4 adds the UI and
remaining business rules like pricing/quote computation), customer
discovery (Prompt 5), handover/payments/notifications (Prompt 6),
finance/reports (Prompt 7), CI/EAS automation (Prompt 8), and the
release-candidate/pilot handoff (Prompt 9) — see the PRD for full scope
per phase.
