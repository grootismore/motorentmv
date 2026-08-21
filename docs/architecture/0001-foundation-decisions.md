# 0001 — Foundation decisions (Phase 0)

Status: accepted. Scope: the engineering scaffold only — see the PRD for product scope.

## Navigation: Expo Router, with route groups as the auth/role boundary

`(auth)`, `(customer)`, `(renter)`, `(shared)` are route groups under `app/`.
Only one of `(auth)` / `(customer)` / `(renter)` is mounted at a time, via
`Stack.Protected` guards in `app/_layout.tsx`, gated on `src/lib/app-shell.tsx`'s
`experience` state. `(shared)` is always mounted. This avoids URL collisions
between groups that would otherwise both claim routes like `/` while keeping
each group's screens un-prefixed and easy to reach directly.

`app-shell.tsx` is a **temporary placeholder** — real session/role state
(Supabase Auth + `organization_members`) replaces it in Phase 1 (Prompt 3). It
exists only so the route structure is manually navigable today.

## Backend: Supabase, client boundary wired but inert

`src/lib/supabase.ts` creates a client only when `EXPO_PUBLIC_SUPABASE_URL` /
`EXPO_PUBLIC_SUPABASE_ANON_KEY` are set; otherwise it's `null` and `getSupabase()`
throws with a clear message. No schema exists yet (Prompt 2). Session storage
uses plain `AsyncStorage` for now — Phase 1 auth work should replace this with a
`SecureStore`-backed hybrid adapter (encrypt the session, key in SecureStore,
blob in AsyncStorage) before real user sessions exist; plain AsyncStorage is not
secure enough for auth tokens on its own.

## Env validation: Zod, `EXPO_PUBLIC_*` only

`src/lib/env.ts` validates `process.env` once at import time via a Zod schema
and exports both the parsed `env` singleton and a pure `parseEnv()` for testing.
Only `EXPO_PUBLIC_*` vars are read — secrets never belong in client-bundled
config (`app.config.ts`, EAS Update payloads, or `EXPO_PUBLIC_*` vars).

## Design tokens: small, accessible, theme-aware

`src/design-system/tokens.ts` + `ThemeProvider.tsx` provide colors (light/dark,
chosen for WCAG AA contrast), spacing, radii, and type scale — enough for
navigable shells, not a full component library. `primary` (`#1877A8`) reuses the
accent color from the PRD document itself as a placeholder brand color; branding
is explicitly unconfirmed per the PRD's "Working title" note. Status is always
paired with text/iconography, never color alone (PRD §11 accessibility NFR).

## Dependency/tooling choices forced by the current ecosystem

- **`jest` pinned to `^29.7.0`** (not the `^30.x` that `expo install` resolves by
  default): `jest-expo@57.0.4`'s own dependencies (`jest-environment-jsdom`,
  `@jest/globals`) are still Jest-29-based. Installing Jest 30 creates a
  version-skewed, nested `jest-mock` that crashes on the first test run
  (`clearMocksOnScope is not a function`). `@types/jest` is pinned to match.
- **`test-renderer` (not `react-test-renderer`)**: `@testing-library/react-native@14`
  peer-depends on the new lightweight `test-renderer` package, the maintained
  replacement for the deprecated `react-test-renderer`.
- **`.npmrc` sets `legacy-peer-deps=true`**: `expo-router`'s optional web-preview
  dependencies (`@expo/ui`, `vaul`, `@radix-ui/*`) pin an exact `react-dom` patch
  version that conflicts with npm's strict peer resolution on a pure native
  project. This is an ecosystem-wide issue, not specific to this repo.
- **No `@expo/vector-icons` dependency yet**: state primitives use text/glyph
  cues instead, to avoid an icon dependency before any screen actually needs one.

## Deferred to later phases

- Supabase schema, RLS, migrations, seed data — Prompt 2.
- Real auth (magic link/OTP), session restoration, org onboarding — Prompt 3.
- TanStack Query / Zustand — not introduced yet; nothing in Phase 0 needs server
  or shared client state. Add them when Phase 1 screens actually need them,
  rather than pre-wiring unused infrastructure.
- `@sentry/react-native` — deferred until there's a release channel worth
  monitoring.
