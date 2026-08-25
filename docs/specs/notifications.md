# Feature Specification: Notifications

**Status**: ✅ Implemented & tested (data layer + in-app UI) / 📱 needs device validation (real push delivery)
**PRD Reference**: `docs/PRD.md` §12

## Overview

In-app and push notifications on every booking status change, inspection record, and payment entry, deep-linking to the relevant booking, with unread counts and bulk "mark all read" on both the customer and renter side.

## User Stories

1. As a customer or renter, I want to know immediately (in-app, and via push if the app isn't open) when a booking I'm party to changes status.
2. As a customer, I want to see _why_ my request was declined or needs more information, inline in the notification — not have to go dig for a staff-only note.
3. As a user with several unread notifications, I want to mark them all read in one action.
4. As a user, tapping a notification should take me straight to the relevant booking, not just to a generic inbox.

## Acceptance Criteria

- [x] AC1: A server-side fan-out trigger (`20260821160003_notifications_fanout.sql`) writes a `notifications` row on every relevant booking-status/inspection/payment event — not a client-side "remember to notify" call that can be skipped on a crash.
- [x] AC2: A booking's decline/needs-info note is included in the notification payload and rendered inline, not requiring a separate staff-only lookup.
- [x] AC3: Unread count and bulk "mark all read" work for both customer and renter recipients.
- [x] AC4: Tapping a notification deep-links to the specific booking it's about.
- [x] AC5: RLS scopes `notifications` to `recipient_id = auth.uid()` — a user only ever sees their own.

## Technical Design

### Architecture

`src/features/notifications/` (queries + a delivery `service.ts`) + `app/(shared)/notifications.tsx` (the inbox screen, in the always-mounted `(shared)` route group so it's reachable from both customer and renter shells).

### Data Models

`notifications` (`recipient_id`, `type`, `payload: jsonb`, `read_at`, `delivery_status`, `delivered_at`) — see `supabase/migrations/20260821120018_notifications.sql`, `20260821160003_notifications_fanout.sql`.

## Testing Plan

- [x] `src/features/notifications/queries.test.ts`.
- [x] `src/features/notifications/service.test.ts`.
- [x] `__tests__/app/(shared)/notifications.test.tsx`.
- [x] SQL suite: fan-out trigger fires on the expected events, RLS scoping (`supabase/local-dev/`).
- [ ] 📱 Real push delivery to a device — no EAS project linked yet (`docs/ROADMAP.md` item 3); permission requests, local-notification scheduling, and the deep-link handler are code-complete and this is the one remaining unverified piece.
