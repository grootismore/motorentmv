# Feature Specification: Authentication & Role Onboarding

**Status**: ✅ Implemented & tested (client logic) / 📱 needs device validation (native sign-in form controls)
**PRD Reference**: `docs/PRD.md` §1, §14

## Overview

Supabase email+password auth, a role-select screen that sets a persisted "customer" or "renter" intent, and a single decision table (`computeAppGate`) that both route groups read to decide what's mounted. Real organization membership always overrides the one-time role choice.

## User Stories

1. As a new user, I want to choose "rent a motorcycle" or "manage a rental business" so the app shows me the right experience without forcing sign-in just to browse.
2. As a customer, I want browsing (search, listings, quotes) to work without an account, and to only be asked to sign in when I actually submit a booking request.
3. As a returning signed-in customer with no fleet of my own, I want the app to remember that I'm a customer, not push me into "create your organization" onboarding every time I reopen it.
4. As a renter, I want signing in to take me straight to my dashboard if I already belong to an organization, regardless of what I originally chose on role-select.

## Acceptance Criteria

- [x] AC1: A signed-out user with no chosen intent sees role-select (`computeAppGate` returns `'auth'`).
- [x] AC2: A signed-out user who chose "customer" intent goes straight to `'customer'` — anonymous browsing, no auth route gate.
- [x] AC3: A signed-out user who chose "renter" intent still goes to `'auth'` (sign-in), not straight to a renter shell with no session.
- [x] AC4: A signed-in user with an active `organization_members` row is always `'renter'`, regardless of stored intent.
- [x] AC5: A signed-in user with no membership and `intent === 'customer'` is `'customer'`.
- [x] AC6: A signed-in user with no membership and no known intent (or a stale `'renter'` intent with no org to show for it) is `'auth'` — re-asks role-select rather than defaulting to renter onboarding. **This was a real, fixed bug**: the fallback used to be `'renter'`, silently pushing every returning customer with no fleet of their own into "create your organization" onboarding on every fresh app launch, because the chosen intent was never persisted (in-memory only) before the fix.
- [x] AC7: The chosen intent survives an app restart (`AsyncStorage`-backed, not in-memory).
- [x] AC8: `hasSession === undefined` (session still restoring) and `isIntentLoading === true` (intent still being read back) both resolve to `'loading'`, never a premature `'auth'`/`'customer'`/`'renter'` decision.

## Technical Design

### Architecture

`computeAppGate.ts` is a pure, zero-dependency decision function (testable without pulling in Supabase/AsyncStorage). `useAppGate.ts` wires it to real session state (`AuthProvider`), real membership (`useMyMembership`), and real persisted intent (`experience-intent.tsx`). `app/_layout.tsx`/`app/index.tsx` read the resulting gate value to mount the matching route group via `Stack.Protected`/`Redirect`.

### Data Models

No new tables — reads `organization_members` (existing schema) and a client-only `AsyncStorage` key for intent.

### Dependencies

- [x] Supabase Auth (email+password)
- [x] `useMyMembership` query
- [x] `AsyncStorage`-backed `experience-intent.tsx`

## Testing Plan

- [x] `src/features/auth/computeAppGate.test.ts` — every branch of the decision table, including the AC6 fix, run in CI.
- [x] `src/features/auth/session.test.ts` — session handling.
- [x] `__tests__/app/(auth)/role-select.test.tsx` — role-select screen behavior.
- [ ] 📱 The sign-in screen's actual native `TextField`/`Button` rendering — code-complete, unverified on device (same gap as `docs/specs/native-ui.md`).

## Known Gaps

- 🚧 No dual-role switcher: a user who is both customer and renter staff must sign out and re-choose (see `docs/ROADMAP.md` medium-term item 7).
