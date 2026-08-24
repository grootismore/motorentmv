# RideFinder

Motorcycle rental operations and booking for Malé and Hulhumalé — an Expo /
React Native app for iOS and Android, backed by Supabase.

RideFinder has two experiences in one app: a **customer** side (browse
available motorcycles, request a booking, track it through pickup and
return) and a **renter** side (fleet management, booking inbox, handover
inspections, a manual payment ledger, and staff invites) for the rental
business itself.

## Features

- **Anonymous browsing, gated sign-in** — customers can search, view
  listings, and see quotes without an account; sign-in is only required to
  submit a booking request.
- **Request-to-book workflow** — a customer's request lands in the renter's
  inbox for acceptance, not an instant booking. The full state machine
  (requested → accepted/declined/needs-info → ready → active → completed,
  plus cancellation) is enforced server-side.
- **Document and deposit requirements, enforced server-side** — a customer
  can't submit (or resubmit after needs-info) a booking request without a
  license and an ID/passport photo already on file, and if the vehicle
  carries a refundable deposit, at least that much must be recorded as paid
  in the ledger before the renter can hand over the keys (mark the booking
  "active"). Both gates live in the same RPCs/trigger that already enforce
  the rest of the state machine, so there's no client-side bypass.
- **Real-time availability** — search excludes any vehicle with an
  overlapping accepted booking or a manual maintenance block, computed with
  correct half-open time-range logic (back-to-back bookings never falsely
  collide).
- **Fleet management** — full CRUD for vehicles, per-vehicle hourly/daily
  rates, manual availability blocks, and photo uploads.
- **Pickup/return inspections** — a structured checklist (odometer,
  fuel/battery, condition notes, before/after photos) recorded at both ends
  of a rental, with lifecycle gates that block starting or completing a
  booking without one on file.
- **Manual payment ledger** — cash, bank transfer, or an external reference;
  no card data is collected or stored anywhere in this app.
- **Notifications** — in-app and push notifications on every booking status
  change, inspection record, and payment entry, deep-linking straight to the
  relevant booking; the renter's own note (e.g. why a request was declined
  or needs more information) shows inline, and unread counts/bulk "mark all
  read" are available on both the customer and renter side.
- **Finance tracking** — a manual payment ledger plus standalone income
  (owner/manager-only) and expenses, a month-navigable finance report by
  income source and expense category, and a line-item CSV export via the
  native share sheet.
- **Fleet maintenance log** — a queryable service history per vehicle
  (description, cost, odometer reading), separate from the payment ledger.
- **Customer profile and documents** — editable name/phone, plus license/ID
  photo uploads that are private to the uploading customer alone (not even
  the renting organization can see them) and persist across every future
  booking rather than being re-collected per rental.
- **Native navigation** — both the customer and renter tab bars use Expo
  Router's native tabs (`expo-router/unstable-native-tabs`), rendered by the
  OS's own `UITabBarController` / Material bottom-nav, not a JS-drawn
  imitation.

## Tech stack

- **Expo SDK 57**, React Native 0.86, React 19, TypeScript (strict)
- **Expo Router** (file-based navigation) with development builds
  (`expo-dev-client`) — this app uses native modules, so Expo Go isn't
  sufficient
- **Supabase** — Postgres with row-level security on every table, storage
  buckets for photos/documents, and RPC functions as the sole write path for
  anything business-critical
- **TanStack Query**, with an AsyncStorage persister for offline-read
- **Zod** for environment validation
- ESLint (`eslint-config-expo`) + Prettier, Jest + React Native Testing
  Library, Maestro for on-device E2E flows

## Getting started

### Prerequisites

- Node.js 22+ (see `.npmrc`'s `engine-strict=true`)
- Xcode 26.4+ for iOS builds (Expo SDK 57 requires Swift 6.2+) and/or
  Android Studio for Android
- A [Supabase](https://supabase.com) project
- An Expo account + [EAS CLI](https://docs.expo.dev/eas/) if you plan to
  build with EAS

### Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your own Supabase project's URL and anon key:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then apply every migration in `supabase/migrations/` (in order) to that
project. The anon/publishable key is safe to embed client-side by Supabase's
own design — row-level security, not key secrecy, is what protects data.

The app boots without these set (`EXPO_PUBLIC_APP_ENV` defaults to
`development`), but auth, booking, and fleet management all need a real
project behind them to do anything useful — without it, requests fail with a
clear "Supabase is not configured" message rather than the app crashing.

### Running

```bash
npx expo run:ios       # build + launch a dev build on the iOS Simulator
npx expo run:android   # build + launch a dev build on an Android emulator
npx expo start         # start Metro once a dev build is installed
```

### Scripts

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test          # Jest
npm run format        # Prettier --write
npm run format:check  # Prettier --check
npm run verify        # format:check + lint + typecheck + test, in order
```

## Project structure

```
app/                   Expo Router routes (file-based)
  (auth)/               Role selection, sign-in/create-account (Supabase email + password)
  (customer)/           Customer tabs: explore/search, listing, checkout,
                        bookings, profile — anonymous browsing until checkout
  (renter)/             Onboarding, or the renter tabs once an org exists
    fleet/               Vehicle list/detail/create/edit
    more/staff.tsx       Staff invitation
  (shared)/             Notifications inbox; support/legal are placeholders
__tests__/             Tests for files under app/ (kept out of app/ itself —
                        Expo Router's require.context would otherwise bundle
                        them into the app)
src/
  components/           Shared UI primitives (Button, TextField, states, ...)
  design-system/        Design tokens, ThemeProvider
  features/             One folder per domain: auth, organizations, fleet,
                        discovery, checkout, profile, documents, inspections,
                        payments, finance, notifications, bookings, activity,
                        dashboard
  lib/                   env, supabase client, generated database types,
                        query client/persister, datetime helpers, uploads
scripts/ios/            Unsigned device-IPA build script (see CI below)
supabase/
  migrations/            Ordered SQL schema/RLS/RPC migrations
  local-dev/             A Docker-free local Postgres harness + test runner
  seed.sql               Demo data
.maestro/               On-device E2E flow files
```

## Database

Schema lives in `supabase/migrations/`: profiles, organizations, membership,
vehicles, rates, availability blocks, bookings, booking events, inspections,
transactions, expenses, documents, vehicle maintenance records,
notifications, and three private storage buckets (vehicle photos, booking
documents, customer documents) — plus the functions/RPCs/triggers that
enforce the rules below at the database level, not just in application code.

- **Money** is always an integer `*_laari` column (never floating point);
  **time** is always `timestamptz` (UTC), with Maldives-local (UTC+5)
  formatting handled entirely at the display layer.
- **Booking overlap** is prevented by a Postgres GiST exclusion constraint
  with half-open bounds, so back-to-back bookings are correctly allowed.
- **Pricing and policy** are computed server-side at the moment of
  acceptance (`compute_booking_quote`), never taken from the client, and are
  frozen onto the booking once set.
- **Idempotency**: every state transition and the booking-creation RPC are
  safe to retry — a duplicate network call never double-writes or errors.
- **Row-level security** is enabled on every table, scoped by organization
  membership; financial tables default to owner/manager-only visibility.
- **Conflict errors never leak another customer's booking window** — a
  rejected overlap is replaced with a fixed, non-leaking message.

### Running the database tests locally

The full Supabase CLI stack (`supabase start`) needs Docker. If that's not
available, `supabase/local-dev/` runs the same migrations and test suite
against a plain local Postgres instance instead:

```bash
# Requires a local PostgreSQL 16 server
bash supabase/local-dev/run-tests.sh          # migrations -> seed -> test suite
bash supabase/local-dev/generate-types.sh     # regenerate src/lib/database.types.ts
```

This proves, with real assertions: tenant isolation, ownership and
role-based visibility, storage scoping, the full booking engine (boundary
adjacency, time-zone equivalence, rounding, idempotency, non-leaking
conflicts), and — via two genuinely concurrent sessions — that exactly one
of two simultaneous accept attempts on overlapping bookings ever succeeds.

## CI: unsigned iOS device build

`.github/workflows/ios-unsigned-device.yml` builds an **unsigned** arm64
iOS device archive on every push and on manual dispatch, for sideloading
with Sideloadly, AltStore, or SideStore (which re-sign it at install time —
it cannot be installed as-is, and no Apple certificates or provisioning
profiles are ever used). `scripts/ios/build-ios.ts` drives the archive,
packaging, and a full structural re-validation of the finished `.ipa`
(architecture, bundle identifier, embedded JS bundle, required native
modules) before it's uploaded as a workflow artifact.

`.github/workflows/security-quality-gate.yml` is the required PR gate on a
fast Linux runner: format/lint/typecheck/test, a dependency vulnerability
review, a non-blocking `expo-doctor` check, and — against a real, ephemeral
Postgres instance — every migration plus the full SQL/RLS assertion suite
(the same `supabase/local-dev/run-tests.sh` described below). Two smaller
workflows enforce PR hygiene on top of that: Conventional Commits-style PR
titles, and lockfile consistency.

## Known limitations

- **The app icon, adaptive icon, and splash image are still Expo's
  unmodified scaffold placeholders** — `assets/icon.png` and
  `assets/android-icon-*.png` are the default `create-expo-app` template
  graphic (one still has its design-grid guides baked into the PNG),
  `assets/splash-icon.png` is unreferenced by any config and unused. Real
  RideFinder brand assets are needed before any store submission or pilot
  distribution; this is a design decision for the business, not something
  generated here.
- No iOS Simulator/Android Emulator/physical device in this development
  environment — verification here is `expo export`, the full unit/component
  test suite, and the local Postgres RLS/booking-engine suite; the CI
  workflow above produces a real device build to verify on hardware.
- `.maestro/` E2E flows are written but not run here for the same reason;
  the customer flow's sign-up step also assumes the Supabase project's
  "Confirm email" setting is off, since no mail-testing integration exists
  to click a real confirmation link.
- Fleet availability-block dates use a plain text field rather than a native
  date/time picker.
- The renter calendar is a lightweight agenda grouped by pickup date, not a
  calendar-grid view.
- There's no scheduled job to automatically flip a booking to "overdue" —
  it's computed for display only, from the stored return time.
- Real push-notification delivery to a physical device isn't verified here
  (no EAS project linked yet); permission requests, local notifications, and
  the deep-link handler are.
- A dual-role (customer + renter) in-app mode switcher isn't built yet — a
  signed-in user who is both would need to sign out and re-choose a role.

## Roadmap

Deeper CI/EAS automation (a linked EAS project for real push delivery,
TestFlight/Play internal testing) and a release-candidate pilot handoff are
the next phases planned. See "Known limitations" above for what a pilot
handoff still needs first, in particular real app icon/splash branding.
