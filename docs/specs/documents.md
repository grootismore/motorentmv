# Feature Specification: Customer Documents

**Status**: ✅ Implemented & tested (logic/RLS) / 📱 needs device validation (capture UI)
**PRD Reference**: `docs/PRD.md` §3, §11

## Overview

Customer license/ID photo uploads, private to the uploading customer alone (not even the renting organization can see them), persisting across every future booking rather than being re-collected per rental — and the server-side requirement gate on `request_booking()` that depends on them.

## User Stories

1. As a customer, I want to upload my license and ID once and have it apply to every future booking, not re-upload per rental.
2. As a customer, I want confidence that my ID documents are private to me — not visible to the rental business, only used to satisfy the booking-eligibility check.
3. As a customer, I want a clear, specific message if I try to request a booking without both documents on file (or with one rejected), not a generic failure.

## Acceptance Criteria

- [x] AC1: `documents` rows scoped by `profile_id` (customer-private) are RLS-visible only to the uploading customer — the organization the booking is with cannot query them (`20260821210001_customer_documents_storage.sql`).
- [x] AC2: `hasRequiredDocuments()` requires both a `license` and an `id_card` document with `status !== 'rejected'` (pending or verified both count).
- [x] AC3: `request_booking()` enforces the same check server-side (`20260821220001_booking_requirements.sql`) — the client-side check is a UX convenience, not the actual security boundary.
- [x] AC4: A rejected document doesn't silently count toward the requirement; the customer needs a fresh upload.

## Technical Design

### Architecture

`src/features/documents/queries.ts` (upload/list/the `hasRequiredDocuments` pure check) + `src/features/documents/DocumentsSection.tsx` (the profile-screen UI) + the same upload utility (`src/lib/uploads.ts`) fleet photos use.

### Data Models

`documents` table, `document_type: license | id_card | vehicle_photo | inspection_photo_before | inspection_photo_after | receipt | other` (one enum spanning several use cases — `profile_id`-linked rows are the customer-document case this spec covers), `document_status: pending | verified | rejected`.

## Testing Plan

- [x] `src/features/documents/queries.test.ts` — `hasRequiredDocuments`'s full truth table (no documents, only one type, both present, a rejected one excluded, verified/pending both counting).
- [x] `src/features/documents/DocumentsSection.test.tsx`.
- [x] SQL suite: `documents` RLS (profile-owner-only visibility, storage-bucket scoping) (`supabase/local-dev/`).
- [ ] 📱 The actual camera/photo-library capture UI needs a device — same gap as `docs/specs/fleet-management.md`'s photo upload.
