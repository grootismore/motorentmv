# Status Board

The consolidated, scannable status table across the whole product. See `docs/PRD.md` for the tag legend and environment-constraint explanation, and `docs/specs/` for per-feature acceptance criteria this table summarizes.

**Status**: living document — update this alongside `docs/ROADMAP.md` and `README.md`'s "Known limitations" whenever an item's tag changes; they should never drift out of sync with each other.

| Area                                                          | Status | Spec                                                       | Evidence                                                                                     |
| ------------------------------------------------------------- | ------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Anonymous browsing (search/listing/quote)                     | ✅     | `customer-discovery-and-booking.md`                        | `__tests__/app/(customer)/{explore,search}.test.tsx`, `supabase/migrations/20260821150001_*` |
| Booking request submission + document gate                    | ✅     | `customer-discovery-and-booking.md`, `documents.md`        | `checkout.test.tsx`, `documents/queries.test.ts`, `20260821220001_booking_requirements.sql`  |
| Booking state machine (9 transition RPCs)                     | ✅     | `booking-lifecycle.md`                                     | `bookings/status.test.ts`, SQL suite, `20260821140003_*`, `20260821190001_*`                 |
| Overlap protection / concurrency safety                       | ✅     | `booking-lifecycle.md`                                     | SQL suite (GiST exclusion + concurrent-session test)                                         |
| App-gate role routing                                         | ✅     | `auth-and-onboarding.md`                                   | `computeAppGate.test.ts`                                                                     |
| Sign-in / sign-up (logic)                                     | ✅     | `auth-and-onboarding.md`                                   | `auth/session.test.ts`, `role-select.test.tsx`                                               |
| Sign-in / sign-up (native form controls, on-screen)           | 📱     | `auth-and-onboarding.md`, `native-ui-and-design-system.md` | — needs device                                                                               |
| Pickup/return inspections (forms, gates)                      | ✅     | `booking-lifecycle.md`                                     | `Inspection{Form,Summary,Section}.test.tsx`, `20260821160001_*`                              |
| Inspection photo capture                                      | 📱     | `booking-lifecycle.md`                                     | — needs device                                                                               |
| Fleet CRUD (vehicles, rates, availability, maintenance)       | ✅     | `fleet-management.md`                                      | `VehicleForm.test.ts`, `MaintenanceSection.test.tsx`                                         |
| Fleet/vehicle photo capture & upload UI                       | 📱     | `fleet-management.md`                                      | — needs device                                                                               |
| Fleet list cover-photo thumbnails                             | ✅     | `fleet-management.md`                                      | fixed gap this session; RLS + `useVehicleCoverPhotos`                                        |
| Manual payment ledger                                         | ✅     | `payments-and-finance.md`                                  | `PaymentLedger.test.tsx`, `20260821160002_*`                                                 |
| Deposit-status display on a booking                           | ✅     | `payments-and-finance.md`                                  | matches `activate_booking()`'s own server-side computation                                   |
| Finance reports + standalone income/expenses                  | ✅     | `payments-and-finance.md`                                  | `reports.test.tsx`, `record-income.test.tsx`, `finance/queries.test.ts`                      |
| CSV export (data + logic)                                     | ✅     | `payments-and-finance.md`                                  | `finance/csv.test.ts`                                                                        |
| CSV export (native share sheet, on-screen)                    | 📱     | `payments-and-finance.md`                                  | — needs device                                                                               |
| Customer documents (RLS, requirement check)                   | ✅     | `documents.md`                                             | `documents/queries.test.ts`                                                                  |
| Customer documents (capture UI)                               | 📱     | `documents.md`                                             | — needs device                                                                               |
| Notifications (fan-out, inbox, deep-link, unread/mark-all)    | ✅     | `notifications.md`                                         | `notifications.test.tsx`, `notifications/{queries,service}.test.ts`                          |
| Real push delivery                                            | 📱     | `notifications.md`                                         | no EAS project linked yet                                                                    |
| Native tab bars                                               | 📱     | `native-ui-and-design-system.md`                           | typechecks/bundles; on-screen unverified                                                     |
| Content primitives (`Button`/`TextField`/`GroupedSection`)    | ✅     | `native-ui-and-design-system.md`                           | permanently reverted from `@expo/ui` after two failed device rounds; plain RN, Jest-tested   |
| Translucent surfaces (`GlassSurface`, real native `BlurView`) | ✅     | `native-ui-and-design-system.md`                           | `expo-blur`'s native blur, not `@expo/ui`'s Liquid Glass; typechecks/bundles/tests pass      |
| `Icon` → native SF Symbols conversion                         | 📋     | `native-ui-and-design-system.md`                           | deliberately deferred, not started                                                           |
| `ChipSelect` → native segmented control/menu                  | 📋     | `native-ui-and-design-system.md`                           | deliberately deferred, not started                                                           |
| Automated "overdue" status flip                               | 🚧     | `booking-lifecycle.md`                                     | display-only today; needs a scheduled job                                                    |
| Realtime subscriptions                                        | 📋     | `docs/ROADMAP.md` item 6                                   | not started                                                                                  |
| Dual-role (customer + renter) switcher                        | 📋     | `auth-and-onboarding.md`                                   | not started                                                                                  |
| Offline write queueing                                        | 📋     | `docs/ROADMAP.md` item 8                                   | reads are offline-capable (TanStack Query persister); writes are not                         |
| `.maestro/` E2E flows                                         | 🚧     | `docs/ROADMAP.md` item 4                                   | written, never run in this environment                                                       |
| Real app icon/splash/adaptive icon                            | 🚧     | `docs/ROADMAP.md` item 2                                   | Expo scaffold placeholders still in place                                                    |
| CI: fast Linux quality gate                                   | ✅     | `docs/ARCHITECTURE.md`                                     | `security-quality-gate.yml`, runs on every PR                                                |
| CI: unsigned iOS device IPA build                             | ✅     | `docs/ARCHITECTURE.md`                                     | `ios-unsigned-device.yml` — the actual on-hardware verification path                         |
| CI: database/RLS SQL suite                                    | ✅     | `docs/ARCHITECTURE.md`                                     | runs against a real ephemeral Postgres instance in CI                                        |

## Reading this table

- A ✅ row means: code exists, and an automated test for it passes in CI right now — re-verify by running `npm run verify` (client) or `bash supabase/local-dev/run-tests.sh` (database) yourself if in doubt, not by re-deriving it from memory.
- A 📱 row is not a gap in the code — it's a gap in _this development environment's_ ability to run Xcode/a simulator/a device. The path to closing every 📱 row is the same one: `docs/ROADMAP.md` item 1, a real device pass using the artifact `ios-unsigned-device.yml` already produces in CI.
- 🚧 and 📋 rows are real, honest gaps — tracked, not hidden.
