# Feature Specification: Payments & Finance

**Status**: ✅ Implemented & tested
**PRD Reference**: `docs/PRD.md` §8, §9

## Overview

A manual payment ledger (cash, bank transfer, or an external reference — never a card processor integration) plus standalone income/expense tracking, a month-navigable finance report, and CSV export via the native share sheet.

## User Stories

1. As a renter, I want to record a payment against a booking (deposit or rent) without integrating a payment processor.
2. As a renter, I want to see a booking's deposit status (how much is owed vs. paid) before I hand over the keys.
3. As an owner/manager, I want to record income that isn't tied to a specific booking (e.g. a one-off service fee), separately from customer bookings.
4. As an owner/manager, I want a monthly report broken down by income source and expense category, and to export it as a line-item CSV.
5. As staff (non-owner/manager), I should not see financial totals I'm not authorized to see.

## Acceptance Criteria

- [x] AC1: `transactions` writes go through a guarded path (`20260821160002_payments_ledger_guard.sql`), not a raw insert — prevents e.g. a negative payment or a payment against a booking in the wrong organization.
- [x] AC2: The deposit-status line on a booking (`docs/PRD.md` §3) reflects the actual sum of recorded `transactions`, computed the same way `activate_booking()`'s server-side gate computes it — the UI and the enforcement never disagree.
- [x] AC3: Standalone income (`type = 'payment'`, `booking_id IS NULL`, `category` set) is schema-distinguishable from booking-tied payments (`20260821200001_transactions_standalone_income.sql`).
- [x] AC4: Finance reports are month-navigable (`maldivesMonthRange`/`previousMaldivesMonth`/`nextMaldivesMonth` — Maldives-local month boundaries, not UTC-calendar ones) and bucket by income source / expense category.
- [x] AC5: CSV export produces a line-item file and invokes the native share sheet (`expo-sharing`).
- [x] AC6: RLS defaults financial tables to owner/manager-only visibility within an organization.

## Technical Design

### Architecture

`src/features/payments/` (the ledger) and `src/features/finance/` (income/expenses/reports/CSV) are separate feature modules sharing the underlying `transactions`/`expenses` tables. `src/lib/datetime.ts`'s Maldives-month helpers are the single source of truth both the client display and any future server-side reporting would need to agree on.

### Data Models

`transactions` (`type: payment | refund | adjustment`, `method: cash | bank_transfer | external_reference | null`), `expenses` (separate table, category + amount + occurred-on).

## Testing Plan

- [x] `src/features/payments/PaymentLedger.test.tsx`.
- [x] `src/features/finance/{csv,queries}.test.ts`.
- [x] `__tests__/app/(renter)/finance/{record-income,reports}.test.tsx`.
- [x] `src/lib/datetime.test.ts` — the Maldives-month arithmetic every report depends on.
- [ ] 📱 The native share sheet's actual on-screen appearance for the CSV export — code invokes `expo-sharing` correctly (unit-testable), but the OS sheet itself needs a device.
