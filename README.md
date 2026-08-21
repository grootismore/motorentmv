# MotoRent MV

Motorcycle rental operations and booking for Malé and Hulhumalé — Expo/React Native TypeScript app for iOS and Android.

**Phase 0** (engineering scaffold) and the **database foundation** (Supabase
schema/RLS/migrations) are done. Every screen is still a navigable shell — no
business logic or UI wiring to the database exists yet. See
[`docs/architecture/0001-foundation-decisions.md`](./docs/architecture/0001-foundation-decisions.md)
for what was decided and why, and the PRD for what comes next.

## Stack

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript (strict)
- Expo Router (file-based navigation) + development builds (`expo-dev-client`)
- Zod for environment validation
- `@supabase/supabase-js` client boundary, typed against the generated schema (inert until `EXPO_PUBLIC_SUPABASE_*` point at a real project — Phase 1)
- Supabase Postgres schema: 13 tables, RLS on every one, server-side booking-overlap protection — see [Database](#database) below
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

No environment variables are required to boot Phase 0 — `EXPO_PUBLIC_SUPABASE_URL`
and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are optional until the Supabase project exists
(Phase 1). `EXPO_PUBLIC_APP_ENV` defaults to `development`.

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
commit — see the Phase 0 verification log below.

## Project structure

```
app/                  Expo Router routes (file-based)
  (auth)/              Role selection, sign-in, verify — shells only
  (customer)/          Customer tab experience — shells only
  (renter)/            Renter tab experience — shells only
  (shared)/            Notifications, support, legal — shells only
src/
  components/          ErrorBoundary, Screen, LoadingState/EmptyState/ErrorState
  design-system/        tokens.ts, ThemeProvider
  lib/                  env.ts, supabase.ts, result.ts, app-shell.tsx
```

`app-shell.tsx` is a **temporary, Phase-0-only** placeholder that lets you switch
between the customer/renter experience for manual QA before real auth exists. It
gets replaced by session/role state in Phase 1 (Prompt 3).

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

## Database

Schema lives in `supabase/migrations/` (18 ordered files) — profiles,
organizations, organization_members, vehicles, vehicle_rates,
availability_blocks, bookings, booking_events, inspections, transactions,
expenses, documents, notifications, plus the helper functions/RPCs that
enforce the rules below at the database level, not just in application code.

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
and role-escalation restrictions, and — via two genuinely concurrent psql
sessions — that exactly one of two simultaneous accept attempts on
overlapping bookings ever succeeds.

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
- Storage bucket RLS (mirroring `documents`' authorization on
  `storage.objects`) isn't part of this migration set — Storage's schema is
  platform-provisioned on a real project, not something a migration creates,
  and configuring it needs a real Supabase project rather than this local
  Postgres harness. Flagged in `20260821120017_documents.sql`.

## What's next

Auth/fleet (Prompt 3), the availability calendar and booking engine
(Prompt 4 — the state machine, overlap protection and `transition_booking_status`
RPC already exist; Prompt 4 adds the UI and remaining business rules like
pricing/quote computation), customer discovery (Prompt 5),
handover/payments/notifications (Prompt 6), finance/reports (Prompt 7),
CI/EAS automation (Prompt 8), and the release-candidate/pilot handoff
(Prompt 9) — see the PRD for full scope per phase.
