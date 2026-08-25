# Roadmap

Status: living document. See `docs/tasks/status-board.md` for the full, granular status table this roadmap summarizes at a higher level, and `docs/PRD.md` for the status-tag legend (✅ / 📱 / 🚧 / 📋).

## Where the product stands today

The core product loop — a customer finds a bike, requests it, a renter accepts and hands it over, both sides track the rental to completion — is ✅ implemented and tested end to end, client and database both. Fleet management, the payment ledger, finance reporting, inspections, and notifications are likewise ✅ implemented and tested at the logic/data layer. The remaining gap across nearly all of these is the same one: 📱 on-device visual/interaction confirmation, which this development environment cannot perform (see `docs/PRD.md`'s "Environment constraints") and which the `ios-unsigned-device.yml` CI workflow's real device build is the actual path to closing.

## Near-term (next phase)

Ordered by what unblocks a real pilot fastest:

1. **On-device verification pass** — install a build from `ios-unsigned-device.yml` on a real device (or run in Simulator/Emulator with Xcode/Android Studio available) and walk every 📱-tagged item in the status board: native `@expo/ui` primitives' actual appearance, the Liquid Glass material, camera/photo-picker flows, the native share sheet, push notification delivery. Convert each to ✅ or file a concrete bug against it — this is the single highest-leverage next step, since almost everything else in the product is already code-complete.
2. **Real app icon, adaptive icon, and splash image** — currently Expo's unmodified scaffold placeholders (`assets/icon.png` still has design-grid guides baked into the PNG). Needed before any store submission or pilot distribution; a design decision for the business, not an engineering task.
3. **EAS project + real push delivery** — no EAS project is linked yet; local notification scheduling and the deep-link handler are built and tested, but real APNs/FCM delivery to a device is unverified.
4. **Run the `.maestro/` E2E flows** — written (search → request → renter accept) but never executed; needs a device/simulator and the Supabase project's "Confirm email" setting off (no mail-testing integration exists here to click a real confirmation link).

## Medium-term

5. **Automated "overdue" status** — currently computed for display only (`displayBookingStatus`), from the stored `ends_at` vs. now; nothing flips the stored `status` to `overdue` automatically. Needs a scheduled job (Supabase cron / Edge Function on a timer), which this environment's Docker-free local harness doesn't model.
6. **Realtime subscriptions** — every screen is currently fetch-on-appear / pull-to-refresh; a renter's booking inbox or a customer's booking-detail screen would benefit from a live Postgres Changes subscription instead of a manual refresh.
7. **Dual-role mode switcher** — a signed-in user who is both a customer and a renter staff member currently has to sign out and re-choose a role via role-select; there's no in-app switcher.
8. **Offline write queueing** — TanStack Query's AsyncStorage persister already gives read-through offline support; writes (a booking request, a ledger entry) still require connectivity at submit time.

## Deliberately out of scope

Documented, not forgotten:

- **Card payments** — this app is a manual ledger by design (PRD non-functional requirement: no card data collected or stored anywhere in this app). Not a gap to close.
- **`Icon`/`ChipSelect` conversion to native SF Symbols/segmented controls** — evaluated and deliberately deferred; see `README.md`'s "Known limitations" for the specific regression-risk reasoning (icon-name mapping and variable-option-count pickers carry real risk with no way to visually verify the result in this environment).
- **A second native (Swift/SwiftUI) client** — considered and explicitly rejected; RideFinder is this Expo/React Native app. See git history around the `ios-native/` revert for the record of that decision.

## How this roadmap gets used

When picking up the next phase of work: read `docs/tasks/status-board.md` for the granular per-feature state, pick the highest-priority 📱 or 🚧 item whose fix doesn't require a device (schema/logic gaps), and use a real device pass (item 1 above) to systematically clear the 📱 backlog. Update the status board and this roadmap together as items move between tags — they should never drift out of sync with each other or with `README.md`'s own "Known limitations" section.
