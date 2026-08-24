# RideFinder — native iOS client

A from-scratch Swift/SwiftUI rebuild of the customer-facing half of
RideFinder, talking to the **same** Supabase project/schema as the Expo
app at the repository root (`../app`, `../src`, `../supabase`) — this is
a second client for one backend, not a new product and not a backend
redesign. The Expo app is untouched and remains the working reference
implementation; nothing here modifies it, and nothing here modified any
migration, RPC signature, RLS policy, or storage bucket.

## Read this first: nothing here has been compiled

This was written in a Linux container with **no Swift toolchain, no
Xcode, and no iOS Simulator** — `swift`/`swiftc`/`xcodebuild` are not
installed, and installing a Swift toolchain wasn't possible either (the
network policy here blocks `download.swift.org`, and no Swift package
exists in this distro's `apt` repositories). That means:

- **No file in this directory has ever been built, run, or tested.**
  Nothing here should be described as "working" until it's actually been
  opened in Xcode and built.
- Every API used (Supabase Swift SDK, `PackageDescription`'s
  `.iOSApplication` product type, SwiftUI/Observation APIs) was checked
  against real source or real documentation before being used — see
  "How this was verified" below — rather than guessed from memory. That
  raises confidence, it does not substitute for a real build.
- **First step, before anything else**: open `Package.swift` in Xcode
  26+ on a Mac and build. Report back whatever Xcode says — a compile
  error in a spot this README doesn't already flag as risky is the most
  useful thing you can tell me next.

### How this was verified without a compiler

- The actual `supabase-swift` source was cloned and read directly
  (`SupabaseClient.swift`, `AuthClient.swift`, `PostgrestFilterBuilder.swift`,
  `KeychainLocalStorage.swift`, ...) to confirm real method signatures —
  `client.auth.signIn(email:password:)`, `client.rpc(_:params:)`,
  `client.from(_:).select().eq(...)`, the `AuthLocalStorage` protocol,
  etc. — rather than relying on possibly-stale training knowledge.
- `Product.iOSApplication`'s parameters (from `AppleProductTypes`) were
  checked against real, working example `Package.swift` files found via
  web search, since Apple's own docs pages for it were unreachable from
  this environment.
- Every Postgres RPC's parameter names and every table's column names
  were copied from `../src/lib/database.types.ts` and the migrations
  under `../supabase/migrations/`, not invented.

None of that adds up to "compiles." It adds up to "the API calls are
real API calls, correctly spelled, as of when this was written."

## Why `Package.swift`, not a hand-written `.xcodeproj`

The task called for both "an Xcode project" and "Swift Package Manager."
Xcode 15+ can open a `Package.swift` that declares a `.iOSApplication`
product directly as a project — build, run, and archive, no `.xcodeproj`
involved — which is what this does. That was a deliberate choice given
the constraint above: a hand-authored `.pbxproj` (the traditional
`.xcodeproj` format) is a fragile, deeply cross-referenced file with zero
tooling to validate it outside Xcode itself; a mistake in one is often
"Xcode refuses to open the project" with little explanation. A mistake in
`Package.swift`, by contrast, is an ordinary Swift compiler error in a
single file, in a format any Swift developer can read and fix. If the
team prefers a conventional `.xcodeproj` later, Xcode can generate one
from this package's targets at any time — nothing about the source
layout below needs to change to do that.

## Setup

1. Open `ios-native/Package.swift` directly in Xcode 26+ (`File > Open…`,
   select `Package.swift`, not this `README.md`).
2. Edit `Sources/RideFinderApp/Resources/AdditionalInfo.plist` and fill
   in `SUPABASE_URL` / `SUPABASE_ANON_KEY` for the **same** Supabase
   project the Expo app uses (`../.env.local`'s values, or the project
   dashboard). Both are safe to commit once filled in — see
   `SupabaseEnvironment.swift`'s doc comment for why (RLS, not key
   secrecy, is the actual boundary — same reasoning as `../src/lib/env.ts`).
   The app throws a clear "missing SUPABASE_URL" screen at launch until
   these are set, rather than failing silently deeper in.
3. Build and run on an iOS 17+ Simulator or device.
4. `swift test` (or Xcode's Test navigator) runs `RideFinderCoreTests` —
   see "Testing" below for what that does and doesn't prove.

## Project structure

```
ios-native/
  Package.swift              SPM manifest + the .iOSApplication product
  Sources/
    RideFinderApp/            App entry point (@main), root gate wiring
    RideFinderCore/           Models, networking, design tokens, domain logic
      Models/                 One file per table/RPC-row-shape, 1:1 with
                              database.types.ts -- see each file's own
                              doc comment for which migration it mirrors
      Networking/              SupabaseEnvironment (Info.plist config),
                              SupabaseClientProvider (one shared client)
      DesignSystem/            Ocean Glass palette ported to SwiftUI Color
      Domain/                  Pure logic: Money, MaldivesTime,
                              BookingStatusDisplay, AppGate,
                              DocumentRequirements -- each a direct port
                              of one src/**/*.ts file, doc-commented with
                              which one
    RideFinderAuth/            AuthStore (@Observable), role-select,
                              sign-in, the app-gate root view
    RideFinderDiscovery/       The one complete vertical-slice feature --
                              see "What's implemented" below
  Tests/
    RideFinderCoreTests/       Swift Testing, mirroring the Jest suite's
                              pure-logic test cases file-for-file
```

## What's implemented

A complete **data and domain layer**, and **one complete customer-facing
flow** end to end:

- Every table in the schema has a matching `Codable` Swift model
  (`RideFinderCore/Models/`), field-for-field against
  `database.types.ts` — no invented columns.
- A real `SupabaseClient` (the official SDK), session persistence via the
  SDK's own `KeychainLocalStorage` (the Apple-platform default — this
  needed no custom Keychain code to satisfy "Keychain for sensitive
  session data").
- The five pure-logic modules the Expo app's own Jest suite covers most
  thoroughly (money formatting, Maldives-time display/conversion,
  booking status display+tone, the app-gate decision table, the
  license/ID document-requirement check) are ported 1:1, each with Swift
  Testing cases mirroring the original `*.test.ts` file's cases by name
  and expected value — see `Tests/RideFinderCoreTests/`.
- Role-select -> sign-in/sign-up -> app-gate routing
  (`RideFinderAuth/`), matching `computeAppGate.ts`'s decision table
  exactly, including the "re-ask rather than assume renter" fix already
  applied to the Expo app this session.
- **Explore -> Search results -> Listing detail -> Request booking**,
  fully wired to the real RPCs (`search_available_vehicles`,
  `get_vehicle_listing`, `get_listing_quote`, `request_booking`) with
  native `NavigationStack`, `DatePicker`, `.searchable`-ready `List`,
  `.refreshable` pull-to-refresh, and a native sign-in sheet that resumes
  the booking request automatically once signed in (PRD §5: authenticate
  only at request submission, not to browse).

## What's not built yet

Everything else. Explicitly, in rough priority order a follow-up session
should pick up:

- **Customer**: My Bookings list + booking detail, profile
  editing, license/ID document upload (camera/photo-library permission
  strings are already in `AdditionalInfo.plist`; the actual
  `PhotosPicker`/`AVFoundation` upload code is not written).
- **Renter side, entirely**: today/dashboard, fleet CRUD + photo upload,
  availability blocks, booking inbox (accept/decline/needs-info/ready/
  activate/complete/cancel/no-show — all seven transition RPCs are
  modeled in `RPCParams.swift` but have no UI calling them yet),
  pickup/return inspections, the manual payment ledger, finance reports +
  CSV export, staff invites, vehicle maintenance log.
- **Notifications**: in-app inbox and push (no APNs/EAS-equivalent
  wiring at all).
- **Realtime**: nothing subscribes to Postgres changes; every screen
  above is fetch-on-appear/pull-to-refresh only.
- **XCUITest**: not written. Swift Testing unit tests exist for pure
  logic only (see above) — no UI/end-to-end test exists yet.
- Offline behavior, error-state polish, accessibility pass, and a real
  app icon/accent color (currently Xcode's defaults) — all unaddressed.

## Testing

`Tests/RideFinderCoreTests/` uses Swift Testing (`import Testing`,
`@Test`, `#expect`) per the task's requirement, covering every pure
function in `RideFinderCore/Domain/` with the same cases — same inputs,
same expected outputs — as the Expo app's own `*.test.ts` files for those
exact modules (`money.test.ts`, `datetime.test.ts`,
`bookings/status.test.ts`, `computeAppGate.test.ts`,
`documents/queries.test.ts`'s `hasRequiredDocuments` cases). **These have
never been run** — there's no Swift toolchain in this environment to run
them with. Run them (`swift test`, or Xcode's Test navigator) before
trusting that the port is behaviorally correct, not just plausible-looking.

No tests exist for anything SwiftUI-based (views, `AuthStore`,
`DiscoveryService`) — those need either XCUITest or a real device/
simulator to exercise meaningfully, per this task's own instruction not
to claim something was tested when it wasn't.
