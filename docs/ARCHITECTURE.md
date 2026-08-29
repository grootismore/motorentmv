# Architecture

Status: living document, describing the system as implemented. See `docs/PRD.md` for product scope and `docs/architecture/0001-foundation-decisions.md` for the original Phase 0 scaffolding record.

## Quick reference

- **Platform**: Expo SDK 57, React Native 0.86, React 19, TypeScript (strict)
- **Navigation**: Expo Router (file-based), native tabs (`expo-router/unstable-native-tabs`)
- **Backend**: Supabase — Postgres, row-level security, Storage, RPC-only writes
- **State**: TanStack Query (server state, AsyncStorage-persisted for offline reads), no separate client-state library
- **Validation**: Zod (env config only — RPC/RLS boundaries validate server-side)
- **Testing**: Jest + React Native Testing Library (client), a Docker-free local Postgres harness + SQL assertions (database)
- **CI/CD**: GitHub Actions — a fast Linux quality gate + a macOS unsigned-IPA build

## Why this stack

This is a rebuild-in-place decision record, not a fresh choice — Expo Router + Supabase was already in place when this documentation was written. The reasoning that justifies keeping it:

- **Expo Router** gives file-based routing with real native primitives (native tabs, native stack headers) without hand-rolling a UIKit/Compose bridge — see "Native-first UI" below.
- **Supabase** puts every authorization rule in Postgres RLS policies and every write path behind an RPC, so the mobile client is a thin, replaceable UI layer over a server-authoritative data model — there is no separate backend service to keep in sync with the app.
- **TanStack Query** over Redux/Zustand: almost all state in this app _is_ server state (bookings, fleet, ledger); a cache/sync library fits that better than a general state container, and its AsyncStorage persister gives read-through offline support for free.

## Project structure

```
app/                   Expo Router routes (file-based)
  (auth)/               Role selection, sign-in/create-account
  (customer)/           Customer tabs: explore/search, listing, checkout,
                        bookings, profile — anonymous browsing until checkout
  (renter)/             Onboarding, or the renter tabs once an org exists
  (shared)/             Notifications inbox; support/legal placeholders
__tests__/             Tests for files under app/ (kept out of app/ itself —
                        Expo Router's require.context would otherwise bundle
                        them into the app)
src/
  components/           Shared UI primitives (Button, TextField, GlassSurface, ...)
  design-system/         Design tokens (Ocean Glass palette), ThemeProvider
  features/              One folder per domain — see "Feature modules" below
  lib/                   env, supabase client, generated database types,
                        query client/persister, datetime helpers, uploads
scripts/ios/            Unsigned device-IPA build script (see CI below)
supabase/
  migrations/            Ordered SQL schema/RLS/RPC migrations — the single
                        source of truth for the data model
  local-dev/             A Docker-free local Postgres harness + test runner
  seed.sql               Intentionally empty (see run-tests.sh)
docs/                   This documentation set
.maestro/               On-device E2E flow files (written, not run here)
```

## Feature modules (`src/features/`)

Each folder pairs a `queries.ts` (TanStack Query hooks wrapping Supabase calls) with the screens/components that use it. One paragraph each, in dependency order roughly matching the booking lifecycle:

- **auth** — session, sign-in, the app-gate decision table (`computeAppGate.ts`), persisted role intent.
- **organizations** — membership lookup, org creation, staff invites.
- **discovery** — anonymous search/listing/quote (the three RPCs anon can call).
- **checkout** — rider-details form, the booking-request submission.
- **bookings** — status display/tone mapping, the customer's "My Bookings" list, the renter's inbox.
- **fleet** — vehicle CRUD, rates, availability blocks, maintenance log, cover photos.
- **inspections** — pickup/return checklist forms and summaries.
- **payments** — the manual ledger.
- **finance** — standalone income/expenses, monthly reports, CSV export.
- **documents** — customer license/ID upload, the server-side requirement check mirrored client-side for UX.
- **notifications** — in-app inbox, unread counts, push registration.
- **activity** / **dashboard** / **profile** — renter home-screen aggregation and customer profile editing.

## Data layer (Supabase)

- **Schema**: `supabase/migrations/` — 34 ordered SQL files. Every table has RLS enabled; policies scope by organization membership (renter side) or by uploader/customer identity (customer-private data like license photos).
- **Writes**: business-critical writes go through RPCs (`request_booking`, the eight other transition RPCs, `set_vehicle_rate`, `invite_org_member_by_email`, ...), never a raw client `INSERT`/`UPDATE` on `bookings` or `organization_members`. This is what lets `bookings_guard()` enforce "no editing dates after acceptance" and the document/deposit gates server-side, with no client-side bypass.
- **Types**: `src/lib/database.types.ts` is generated from the migrated schema (`bash supabase/local-dev/generate-types.sh`) — hand-editing it is explicitly disallowed by its own header comment.
- **Local dev/test harness**: `supabase/local-dev/` runs the same migrations + a full SQL assertion suite against a plain local Postgres instance, avoiding a Docker dependency for `supabase start`. This is what CI's `database_tests` job runs.

## Native-first UI

Per this project's own standing rule (`AGENTS.md`): prefer real native platform components over custom-drawn approximations wherever a stable, Expo-compatible option exists.

- **Navigation chrome**: `expo-router/unstable-native-tabs` — a real `UITabBarController` (iOS) / Material bottom-nav (Android), not a custom tab bar view.
- **Content primitives**: `Button`, `TextField`, `GroupedSection` are plain, themed React Native views (`Pressable`/`TextInput`/`View`), not `@expo/ui`-backed. `@expo/ui` versions were built and shipped twice; both times a real device build surfaced the same two bugs (Button ignoring brand color, GroupedSection content going blank), and the second round's screenshots showed the bugs still present after the first round's source-level fix. With no way to verify `@expo/ui`'s on-screen behavior in this environment, it was permanently removed rather than attempted a third time — see `docs/specs/native-ui-and-design-system.md`'s "Why not `@expo/ui`". `Icon`/`ChipSelect` stay custom controls for the same regression-risk reasoning, documented in `README.md`'s "Known limitations".
- **Glass material**: `GlassSurface` renders a real native blur via `expo-blur`'s `BlurView` (`UIVisualEffectView` on iOS) with a token-colored tint layered on top, falling back to a flat opaque token surface on Android and when Reduce Transparency is on — Android has no reliable native blur across OEM skins (`expo-blur` itself defaults it off there), and forcing iOS's onto it would itself violate the native-first rule in the other direction.
- **What this buys**: accessibility semantics (Dynamic Type, VoiceOver, Reduce Motion/Transparency) come from the OS for free, and the app doesn't maintain a second, parallel "looks native" rendering path that can drift from what the platform actually does release over release.

## Design system

`src/design-system/tokens.ts` + `ThemeProvider.tsx` — the "Ocean Glass" palette (deep-ocean navy headers, a lagoon-teal accent, a flat frosted-glass surface treatment), light/dark variants, WCAG-AA-checked contrast, paired status color+icon (never color alone). `src/components/` holds the primitives every screen composes from (`GlassSurface`, `GroupedSection`, typography components, status chips, loading/empty/error states) rather than each screen reinventing card/section chrome.

## Testing strategy

- **Client**: Jest + React Native Testing Library. Unit tests for pure logic (money formatting, Maldives-time conversion, booking status display, the app-gate decision table); component/integration tests for screens, mocking the Supabase client at the `getSupabase()` seam so RPC/table calls are asserted on directly rather than through a deeper mock.
- **Database**: `supabase/local-dev/run-tests.sh` — migrations, seed data, then a SQL assertion suite covering tenant isolation, ownership/role-based visibility, storage-bucket scoping, the full booking engine (boundary adjacency, timezone equivalence, rounding, idempotency, non-leaking conflict errors), and two genuinely concurrent sessions racing an accept — exactly one wins.
- **On-device**: `.maestro/` flows exist (search → request → renter accept) but aren't run in this environment; the CI `ios-unsigned-device.yml` workflow is the actual hardware-adjacent verification (a real installable build on a macOS runner), separate from and complementary to the Maestro flows.
- **What "tested" means in the status tables** (`docs/PRD.md`, `docs/tasks/status-board.md`): passes in one of the two automated suites above, in CI, on the actual code in the repository — not a claim about on-screen appearance, which is 📱-tagged instead.

## CI/CD

- **`security-quality-gate.yml`** (fast Linux runner, required PR gate): dependency vulnerability review, `expo-doctor` (non-blocking), the full database/RLS SQL suite against a real ephemeral Postgres instance, and a lint/format/typecheck/test matrix.
- **`ios-unsigned-device.yml`** (macOS runner, Xcode 26.4+): builds an **unsigned** arm64 iOS device archive via `xcodebuild archive` + a custom packaging/re-validation script (`scripts/ios/build-ios.ts`), for sideloading via Sideloadly/AltStore/SideStore — never touches Apple certificates, provisioning profiles, or EAS signing. Runs on `workflow_dispatch` or a path-filtered push (skips docs/database-only commits).
- **`check-lockfile.yml`** / **`pr-title.yml`**: lockfile-consistency and Conventional-Commits PR-title hygiene checks.

## Key architectural decisions worth calling out

- **Server-authoritative pricing and policy**: `compute_booking_quote`/`compute_booking_policy_snapshot` run at acceptance time and are frozen onto the booking — a client never supplies a price the server trusts.
- **Idempotent writes throughout**: every transition RPC and the booking-creation RPC are safe to retry, so a flaky network never double-writes or double-charges.
- **Anonymous-first customer browsing**: search/listing/quote are public RPCs; sign-in is deferred to the moment a customer actually commits to a request (PRD §5's "authenticate only at request submission" requirement), handled as an inline gate on the checkout screen rather than a route redirect.
- **Persisted, not assumed, role intent**: the app-gate's fallback for "signed in, no org, no known intent" is to re-ask (route to role-select), not to assume renter — a real bug (returning customers silently pushed into "create your organization" onboarding) that was root-caused and fixed; see `src/features/auth/computeAppGate.ts`'s own doc comment.
