# MotoRent MV

Motorcycle rental operations and booking for Malé and Hulhumalé — Expo/React Native TypeScript app for iOS and Android.

**Phase 0** (engineering scaffold), the **database foundation** (Supabase
schema/RLS/migrations), **auth + renter onboarding + fleet management**, the
**customer experience** (anonymous search, listing, request-to-book,
My Bookings — Prompt 5), **handover, payments and notifications**
(pickup/return inspections, a manual cash/bank/reference payment ledger, and
in-app + push notifications — Prompt 6), and a visual-only **"Ocean Glass"
UI/UX redesign** of every screen above (see
[Ocean Glass design system](#ocean-glass-design-system-uiux-redesign) below)
are done.
See [`docs/architecture/0001-foundation-decisions.md`](./docs/architecture/0001-foundation-decisions.md)
for what was decided and why, and the PRD for what comes next.

## Stack

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript (strict)
- Expo Router (file-based navigation) + development builds (`expo-dev-client`)
- Zod for environment validation
- `@supabase/supabase-js` client boundary, typed against the generated schema — real auth (email OTP) and fleet CRUD are wired, inert only until `EXPO_PUBLIC_SUPABASE_*` point at a real project
- Supabase Postgres schema: 13 tables, RLS on every one, server-side booking-overlap protection, private vehicle-photo and booking-document storage — see [Database](#database) below
- TanStack Query for server state, with an AsyncStorage cache persister for offline-read
- expo-image-picker + expo-image + expo-image-manipulator for vehicle/inspection photos (compression, retryable upload — see `src/lib/uploads.ts`)
- expo-notifications for in-app + local test notifications, behind a `NotificationService` interface (`src/features/notifications/service.ts`)
- ESLint (`eslint-config-expo`, flat config) + Prettier
- Jest (`jest-expo` preset) + React Native Testing Library
- Maestro flow files (`.maestro/`) for on-device/simulator E2E — see
  [Known, accepted issues](#known-accepted-issues) below for why they
  aren't runnable in this sandbox

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
.maestro/              E2E flow files (search -> request -> renter accept)
                       — see Known, accepted issues for the email-OTP caveat
app/                  Expo Router routes (file-based)
  (auth)/              Role selection, sign-in, verify — real Supabase OTP auth
  (customer)/          Customer tabs: explore/search, listing, checkout,
                       My Bookings, profile — anonymous browsing, auth gate
                       only at request-to-book (PRD Prompt 5)
  (renter)/            Onboarding (no org yet) or the renter tabs (org exists)
    fleet/              List, detail, create, edit — real Supabase CRUD
    more/staff.tsx       Staff invitation (placeholder-level, see Database below)
  (shared)/            notifications.tsx (real inbox, Prompt 6), support and
                       legal are still shells
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
                         experience-intent.tsx + useAppGate (routing gate),
                         InlineAuthGate (in-screen sign-in, no route change)
    organizations/        CreateOrganizationScreen, membership/invite queries
    fleet/                vehicle/rate/availability-block queries, photo
                         upload, VehicleForm + Rates/Photos/AvailabilityBlocks
                         sections
    discovery/            search/listing/quote queries, SearchForm,
                         VehicleResultItem, FilterBar (customer-facing)
    checkout/             request-submission mutation, RiderDetailsForm
    profile/              customer's own profile query/update
    inspections/           pickup/return checklist queries, InspectionForm/
                         Summary/Section (record, view, acknowledge)
    payments/              manual ledger queries, PaymentLedger (record,
                         view — cash/bank/reference, no card fields)
    notifications/         NotificationService interface + expo-notifications
                         implementation, inbox queries, deep-link listener
  lib/                  env.ts, supabase.ts, database.types.ts, query-client.ts,
                       query-persister.ts, result.ts, datetime.ts (Maldives
                       UTC+5 conversions), uploads.ts (compression + retry)
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

## Customer experience

- **Anonymous browsing**: `computeAppGate` lets a signed-out user who picked
  "customer" on role-select go straight into search/listing/quote — no
  sign-in required until they actually try to request a booking. The
  underlying RPCs (`search_available_vehicles`, `get_vehicle_listing`,
  `get_listing_quote`, `is_vehicle_bookable`) are granted to the Postgres
  `anon` role directly, with a narrowly-scoped RLS policy exposing only
  `vehicle_photo` documents/storage objects for `available` vehicles — never
  direct table access to `vehicles`/`organizations`.
- **Search correctness**: `search_available_vehicles` excludes a vehicle for
  a requested interval if it overlaps an accepted booking
  (`vehicle_busy_ranges`) or a manual `availability_blocks` row, using
  half-open UTC range overlap — proven with a fixture in
  `supabase/tests/06_customer_discovery.sql` covering both a same-instant
  request expressed as a different UTC offset and a window that no longer
  overlaps.
- **Maldives time display**: all customer-facing dates render via
  `formatMaldivesDateTime`/round-trip through `maldivesInputToUtcIso` /
  `utcIsoToMaldivesInput` (`src/lib/datetime.ts`) — fixed UTC+5, no DST, pure
  arithmetic rather than IANA zone-string parsing. Every RPC and stored
  timestamp is still UTC; the conversion is display/input-only.
- **Request-to-book, not instant booking**: submitting checkout calls
  `request_booking`, landing the customer on that booking's own detail
  screen showing status "Requested" — a renter still has to accept it (see
  Auth/routing/bookings above). Nothing about submission charges a payment
  method.
- **Retry-safe submission**: `useSubmitBookingRequest` sets `retry: 1`;
  `request_booking` itself de-duplicates on
  `(vehicle_id, customer_id, starts_at, ends_at)`, so the automatic retry
  and a customer's own "Try again" tap after a failure are both safe to
  replay with identical params — verified in
  `__tests__/app/(customer)/checkout.test.tsx` by asserting all attempts
  carry byte-identical params.
- **Gateway-agnostic checkout**: no payment SDK is integrated. The checkout
  and listing screens both carry an explicit, always-visible notice
  (`checkout-payment-notice` / `listing-payment-notice`) that the request is
  free to submit and payment is handled separately, later — deliberately
  not wired to any specific processor yet.
- **Rider details / documents**: `RiderDetailsForm` collects name/phone only
  and shows a clearly-labeled placeholder
  (`rider-details-document-placeholder`) explaining that license/ID upload
  isn't built yet — bring documents to pickup — the same "visible
  placeholder, not a silent gap" approach as the Prompt 3 staff-invitation
  flow.
- **E2E flows**: `.maestro/customer-search-to-request.yaml`,
  `.maestro/renter-accept-request.yaml`, and the composed
  `.maestro/search-to-accept.yaml` drive the full search → request → renter
  accept path via the app's existing testIDs. See Known, accepted issues for
  why they can't actually be run in this sandbox and the email-OTP caveat
  baked into both flows.

## Handover, payments and notifications

- **Pickup/return inspections** (`src/features/inspections/`): a checklist
  (odometer, fuel/battery %, an accessories toggle set, condition notes,
  before/after photos) recorded by org staff for pickup and again for
  return, shown inline on both the renter and customer booking-detail
  screens (`InspectionSection`). Photos upload through the shared
  `src/lib/uploads.ts` (compressed client-side via `expo-image-manipulator`,
  retried with backoff, distinguishing a permission/validation rejection —
  which retrying can't fix — from a genuinely transient failure) into the
  private `booking-documents` Storage bucket.
- **Customer acknowledgement**: the customer can confirm ("I agree with
  this record") an inspection once it's recorded, via the
  `acknowledge_inspection` RPC — customer-only, idempotent, and the
  checklist becomes immutable once acknowledged
  (20260821160001_inspections_lifecycle.sql).
- **Real lifecycle gates, enforced in the database**: `activate_booking`
  (start the rental) is rejected without a recorded pickup inspection on
  file, and `complete_booking` is rejected without a recorded return
  inspection — enforced in `bookings_guard()`, the same trigger that already
  enforces the state machine and overlap protection, so no client code path
  can bypass it. Deliberately gated on the inspection being _recorded_, not
  the customer's _acknowledgement_ of it — see that migration's own comment
  for why (an unresponsive customer must never be able to block their own
  vehicle's return).
- **Manual payment ledger** (`src/features/payments/PaymentLedger.tsx`):
  cash, bank transfer, or an external reference only — no card field exists
  anywhere in this app or its schema. Supports partial payments, refunds and
  non-payment adjustments (e.g. a late fee). A refund can never exceed what
  was actually received, enforced by a database trigger
  (`transactions_guard`) regardless of insert path, not just a client-side
  check.
- **Audit trail**: every inspection record/acknowledgement and every ledger
  entry is mirrored into the same append-only `booking_events` timeline
  status changes already use (`BookingTimeline`), via `AFTER INSERT`
  triggers — one choke point, not fan-out logic duplicated per writer.
- **Notifications**: `notify_on_booking_event()` (a trigger on
  `booking_events`) generates `notifications` rows for the relevant
  audience — org staff on a new/resubmitted request, the customer on every
  other status change, inspection record, and payment/refund — while never
  self-notifying whoever caused the event. `src/features/notifications/
service.ts` defines a `NotificationService` interface around
  expo-notifications (permission, a local "send test notification" path,
  and a response listener) so no screen imports expo-notifications
  directly. A root-level listener (`useNotificationDeepLinks`,
  `app/_layout.tsx`) deep-links a tapped notification into
  `/bookings/[bookingId]`, resolving to whichever of the renter/customer
  apps is mounted, cold-start included.
- **Private documents and short-lived access, still**: the same rule as
  vehicle photos (Prompt 3/5) — the `booking-documents` bucket is private,
  RLS-scoped to the booking's own customer or org members, and every
  signed URL this app requests is fetched fresh (60 min TTL) rather than
  cached, since a cached one would just be an expired one.

## Ocean Glass design system (UI/UX redesign)

A visual-only redesign of every implemented screen (Prompt 1–6 functionality
unchanged — see [Known, accepted issues](#known-accepted-issues) for the one
tone-mapping exception) to a flat, translucent "glass" iOS-style system:
deep-ocean gradient headers, one saturated teal "lagoon" accent, inset
grouped lists, capsule status chips, KPI tiles — never embossed, bevelled,
or neumorphic.

- **Tokens** (`src/design-system/tokens.ts`): a full semantic palette (`ocean
background`/`ocean deep`, `lagoon primary`/`pressed`, `pearl background`,
  `glass surface`/`glass surface strong`, `glass border`, text
  primary/secondary/tertiary, `divider`, `success`/`warning`/`destructive`/
  `information`/`overdue`/`disabled`), an 11-step typography hierarchy
  (`largeTitle` → `buttonLabel`), a spacing scale, per-component-class radii,
  minimal elevation, and Reduce-Motion-aware motion durations. Every
  pre-redesign token name (`background`, `primary`, `danger`, `radii.md`,
  etc.) is kept as an alias onto the new palette, so nothing not yet
  migrated silently breaks — new code should read the semantic names, not
  the aliases.
- **`GlassSurface`** (`src/components/GlassSurface.tsx`): the one place that
  renders a blurred/translucent panel. iOS: a real `expo-blur` `BlurView`
  plus a thin token-tint layer. Android **always** renders the flat
  opaque/semi-opaque fallback instead of blurring — `expo-blur`'s native
  blur methods on Android are off by default and its own types document
  "decreased performance" for the opt-in ones, so this app never opts in;
  the fallback preserves the same spacing/radius/border/color, just without
  the blur. The same fallback also serves iOS when the user has Reduce
  Transparency on (`useReduceTransparency()`), satisfying the Increased
  Contrast requirement with one code path instead of two.
- **Shared primitives added**: `Typography` (variant components:
  `LargeTitle`, `NavigationTitle`, `SectionTitle`, `CardTitle`, `Body`,
  `SecondaryBody`, `Label`, `Caption`, `KPIText`, `PriceText`,
  `ButtonLabel`), `GroupedSection`/`GroupedRow` (inset grouped-list card),
  `KPITile` (flat frosted stat tile), `Skeleton` (shimmer placeholder,
  respects Reduce Motion), `oceanTabBar.tsx` (the floating translucent tab
  bar, via Expo Router's public `tabBarBackground` option — not a custom
  `tabBar` render prop, so it stays off `expo-router`'s unvendored
  react-navigation internals).
- **Screens**: every customer screen (Explore, Search, Listing detail,
  Checkout, My Bookings, Booking detail, Profile, role-select/sign-in/verify)
  and every renter screen (Today, Calendar, Bookings inbox/detail, Fleet
  list/detail/edit/new, More/Staff) now render through these primitives.
  Four screens got full bespoke layouts matching the reference image
  (Customer Explore, Customer Vehicle Detail, Renter Today, Renter Booking
  Detail); every other screen got the same primitives and tokens applied to
  its existing structure (a "cascade" pass) rather than a from-scratch
  bespoke layout — this is a deliberate scope split given the size of the
  screen inventory, not an inconsistency to be fixed silently later.
- **Intentionally changed visual behavior** (flagged per the "stop and
  report a visual change that needs a functional change" instruction,
  rather than silently altering anything underneath):
  - `StatusTone` gained a new `'overdue'` member; `displayBookingStatus`'s
    overdue case now maps to it instead of reusing `'danger'`
    (`src/features/bookings/status.ts`, test updated to match). This is a
    color/tone-only change — the underlying `booking_status` enum, the
    "overdue is computed for display, never stored" behavior, and every
    status transition rule are all unchanged.
  - The vehicle listing screen's reference-image star rating and
    share/favorite hero buttons are **not** implemented — there is no
    reviews/ratings or sharing/favoriting feature anywhere in the schema or
    app, and fabricating the UI for a feature that doesn't exist would
    misrepresent what the app does. Likewise, the reference's vehicle
    attribute chips only render fields that are real in `VehicleListing`
    (transmission, category, color, year) — no invented "160cc"/"seats"/
    "fuel" chips.
  - **Not built this pass, by explicit choice**: a dual-role mode switcher
    UI. Today, `computeAppGate()` still derives customer-vs-renter purely
    from `experience-intent` + organization membership, exactly as it did
    before this redesign — a signed-in user who is both a customer and org
    member has no in-app control to switch modes; they'd need to sign out
    and re-choose at role-select. Building that switcher is real, scoped
    product/nav work (where does it live, what does it do to `intent` and
    routing) and was deferred rather than bolted on as a purely visual
    afterthought. `useAppGate`/`computeAppGate` were not touched.
- **Accessibility pass**: every interactive control keeps its 44×44pt
  minimum touch target (`minTouchTarget`, already enforced by `Button`,
  `ChipSelect`, and the tab bar); `Typography` leaves `allowFontScaling` at
  RN's default (`true`) so every variant respects Dynamic Type; status is
  still conveyed by label text plus an icon/tone, never color alone;
  `useReduceMotion()`/`useReduceTransparency()` gate all animation and
  blur; the two horizontal photo-carousel layouts
  (`PhotosSection`, `InspectionSummary`) use logical `marginEnd` rather than
  `marginRight` for RTL/Dhivehi readiness. Not independently machine-audited
  for contrast ratio on every glass-surface/text-color combination — flagged
  here rather than asserted as verified.
- **What "screenshots for every principal screen" means here**: this
  sandbox has no iOS Simulator, Android Emulator, or physical device (see
  [Known, accepted issues](#known-accepted-issues)), so no screenshots were
  generated — the same limitation that already applies to Maestro/on-device
  verification for Prompts 5–6. Verification here is static code review,
  `expo export --platform ios`/`--platform android` (both bundle cleanly),
  and the full `npm run verify` (format, lint, typecheck, all 94 tests).

## Database

Schema lives in `supabase/migrations/` (30 ordered files) — profiles,
organizations, organization_members, vehicles, vehicle_rates,
availability_blocks, bookings, booking_events, inspections, transactions,
expenses, documents, notifications, private `vehicle-photos` and
`booking-documents` Storage buckets + their `storage.objects` policies, and
the helper functions/RPCs/triggers that enforce the rules below at the
database level, not just in application code.

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
  and `--platform android` (both bundle cleanly, 1548 modules as of the
  Ocean Glass redesign) plus the full unit/component/RLS test suites — not
  an on-device or in-simulator run. Real device/simulator verification is
  still needed before treating this as done.
- The `.maestro/` flow files are written and reviewed but **not run** in
  this sandbox for the same reason — `maestro test` needs a booted
  simulator/emulator or connected device, neither available here. They're
  provided ready to run once one is.
- Both Maestro flows type a fixed placeholder value into the email-OTP
  step rather than a code retrieved from a real inbox — there's no
  test-inbox/mail-testing integration in this project to fetch one, and
  fabricating success there would misrepresent what's actually verified.
  Running either flow against a real backend needs either that OTP step
  wired to a mail-testing API, or the code supplied out of band before the
  flow reaches it.
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
  customer resubmitting). The customer app (Prompt 5) can now do this via
  the customer booking-detail screen's own resubmission path.
- Real push notification delivery (an Expo push token round-tripping
  through Expo's push service to a physical device) can't be verified in
  this sandbox — no physical device, and `extra.eas.projectId` is still the
  placeholder noted in `app.config.ts` (no EAS project linked yet).
  `expoNotificationService.getExpoPushToken()` is written to fail
  gracefully (returns `null`, never throws) when no project is linked,
  precisely for this reason. What _is_ verified here: permission requests,
  local test-notification scheduling and foreground presentation, the
  notification-tap response listener, and the deep link it drives into
  booking detail — see `src/features/notifications/service.test.ts`.
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

Finance/reports (Prompt 7), CI/EAS automation (Prompt 8), and the
release-candidate/pilot handoff (Prompt 9) — see the PRD for full scope per
phase. A dual-role mode switcher (see
[Ocean Glass design system](#ocean-glass-design-system-uiux-redesign) above)
remains unbuilt and is a candidate for whichever future phase takes on
multi-role navigation.
