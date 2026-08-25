# Feature Specification: Booking Lifecycle & Inspections

**Status**: ✅ Implemented & tested
**PRD Reference**: `docs/PRD.md` §2, §3, §7

## Overview

The renter-facing half of the booking state machine — accept/decline/needs-info/ready/activate/complete/cancel/no-show — plus the pickup/return inspection checklist that gates two of those transitions.

## User Stories

1. As a renter, I want a request to sit in my inbox until I explicitly accept or decline it — never an instant booking.
2. As a renter, I want to ask a customer for more information without losing the request (`needs_info`), and have them able to resubmit.
3. As a renter, I can't hand over the keys (mark a booking `active`) until the required deposit is actually recorded as paid.
4. As a renter, I want a structured pickup/return checklist (odometer, fuel/battery, condition, photos) on file for every rental, and to be blocked from starting/completing a booking without one.
5. As a customer or renter, I want a booking that's still `active` past its return time to visibly read as overdue, without the system needing a background job to have run.

## Acceptance Criteria

- [x] AC1: Nine dedicated RPCs cover every transition (`request_booking`, `accept_booking`, `decline_booking`, `mark_booking_needs_info`, `ready_booking`, `activate_booking`, `complete_booking`, `cancel_booking`, `mark_booking_no_show`) — `bookings.status` is never written directly by a client.
- [x] AC2: `booking_status_transitions` (an allow-list table) + `transition_booking_status()` reject any transition not in the allow-list.
- [x] AC3: Every transition RPC is idempotent — a duplicate network retry never double-writes or errors.
- [x] AC4: `activate_booking()` raises server-side if the recorded deposit (summed from `transactions`) is short of `vehicles.deposit_amount_laari`.
- [x] AC5: A pickup inspection must exist before `activate_booking()` succeeds; a return inspection must exist before `complete_booking()` succeeds.
- [x] AC6: `bookings_guard()` blocks editing `starts_at`/`ends_at` once a booking has left `draft`/`requested`, closing the same "leak another customer's window via direct UPDATE" path AC5 of the discovery spec closes for the accept-time conflict message.
- [x] AC7: `displayBookingStatus()` shows `active` + past `ends_at` as "Overdue" (a distinct tone from other danger states) purely at display time — the stored status stays `active` until an org member completes or cancels it. No scheduled job flips the stored value (documented, not a bug — see `docs/ROADMAP.md` item 5).

## Technical Design

### Architecture

`supabase/migrations/20260821120011_bookings.sql` → `20260821120013_booking_overlap_and_transitions.sql` → `20260821140003_booking_transition_rpcs.sql` → `20260821160001_inspections_lifecycle.sql` → `20260821190001_booking_no_show.sql`, each layering on the last rather than one monolithic migration. Client side: `src/features/bookings/status.ts` (pure display mapping) + `app/(renter)/bookings/[bookingId].tsx` (the actual accept/decline/etc. UI) + `src/features/inspections/` (the checklist forms).

### Data Models

`bookings` (status enum: `draft | requested | accepted | declined | needs_info | ready | active | completed | cancelled | overdue | no_show`), `booking_events` (an audit trail row per transition), `inspections` (`inspection_type: pickup | return`, odometer/fuel-battery/condition/checklist fields).

## Edge Cases

1. Two renters/staff try to accept two overlapping requests simultaneously — exactly one succeeds, SQL-tested with real concurrent sessions (the database's GiST exclusion constraint is the actual guarantee, not application-level locking).
2. A booking is declined or cancelled with a reason — the note shows inline to the customer via the notification, not buried in an audit log only staff can see.

## Testing Plan

- [x] `src/features/bookings/status.test.ts` — every status/tone mapping, including the overdue-computed-at-display-time case.
- [x] `__tests__/app/(renter)/bookings/[bookingId].test.tsx` — the renter inbox/detail screen, including inspection-form gating.
- [x] `src/features/inspections/{InspectionForm,InspectionSummary,InspectionSection}.test.tsx`.
- [x] SQL suite: idempotency, invalid-transition rejection, deposit gate, inspection gate, concurrent-accept race (`supabase/local-dev/`).
- [ ] 📱 Before/after inspection photo capture — needs a device (camera/photo-picker UI).
