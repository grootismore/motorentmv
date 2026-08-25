# Feature Specification: Fleet Management

**Status**: ✅ Implemented & tested (data/screens) / 📱 needs device validation (photo capture)
**PRD Reference**: `docs/PRD.md` §5, §6, §10

## Overview

Vehicle CRUD, per-vehicle hourly/daily rates, manual availability blocks (maintenance windows distinct from bookings), photo uploads, and a service/maintenance log.

## User Stories

1. As a renter, I want to list a vehicle with its registration, make/model, category, transmission, and photos.
2. As a renter, I want to set an hourly and/or daily rate per vehicle, with an effective-date history rather than overwriting a rate in place.
3. As a renter, I want to manually block a vehicle's availability for maintenance without creating a fake booking.
4. As a renter, I want to see my fleet list with real cover-photo thumbnails, not a placeholder icon, once photos exist.
5. As a renter, I want a queryable service history per vehicle, separate from the payment ledger.

## Acceptance Criteria

- [x] AC1: Vehicle create/edit/list/detail screens exist under `app/(renter)/fleet/`, backed by `src/features/fleet/`.
- [x] AC2: `vehicle_rates` keeps `effective_from`/`effective_to` per rate row rather than mutating a single "current rate" column — `set_vehicle_rate()` RPC is the only write path.
- [x] AC3: `availability_blocks` rows are excluded from `search_available_vehicles()` the same way an accepted booking is.
- [x] AC4: The fleet list fetches and displays real cover photos for signed-in renters via `useVehicleCoverPhotos` — this was a real, fixed gap (the list previously showed no thumbnails at all, even though the underlying photos and RLS already supported it).
- [x] AC5: `vehicle_maintenance_records` (description, cost, odometer-at-service) is schema- and UI-distinct from `transactions` (the payment ledger).

## Technical Design

### Architecture

`src/features/fleet/` holds vehicle/rate/availability/maintenance queries and forms; `src/features/fleet/photos.ts` holds the photo-fetching hooks (`useVehiclePhotos`, `useVehicleCoverPhotos`) shared between the renter's own fleet list and the customer-facing discovery cards (see `docs/specs/customer-discovery-and-booking.md`).

### Data Models

`vehicles`, `vehicle_rates`, `availability_blocks`, `vehicle_maintenance_records` — see `supabase/migrations/20260821120008_vehicles.sql` through `20260821120010_availability_blocks.sql`, `20260821180001_vehicle_maintenance_records.sql`. Photos live in the `vehicle-photos` Storage bucket (`20260821130001_vehicle_photo_storage.sql`), RLS-scoped: renter-org members can manage their own vehicles' photos; any authenticated customer can _read_ an available vehicle's photos (this is what makes AC4 and the discovery-card photos possible without loosening org-scoped write access).

## Testing Plan

- [x] `src/features/fleet/VehicleForm.test.ts`.
- [x] `src/features/fleet/MaintenanceSection.test.tsx`.
- [x] SQL suite: fleet RLS (org-scoped CRUD), storage-bucket RLS (`supabase/local-dev/`).
- [ ] 📱 Actual camera/photo-library capture and upload — `src/lib/uploads.ts` (compress + retry) is code-complete and covered by `uploads.test.ts` for its own pure logic, but the native `expo-image-picker` UI itself needs a device.

## Known Gaps

None currently tracked beyond the 📱 device-validation item above.
