# MotoRent MV

Motorcycle rental operations and booking for Malé and Hulhumalé — Expo/React Native TypeScript app for iOS and Android.

This is **Phase 0**: the engineering scaffold only. No business logic or backend
integration exists yet — every screen is a navigable shell. See
[`docs/architecture/0001-foundation-decisions.md`](./docs/architecture/0001-foundation-decisions.md)
for what was decided and why, and the PRD for what comes next.

## Stack

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript (strict)
- Expo Router (file-based navigation) + development builds (`expo-dev-client`)
- Zod for environment validation
- `@supabase/supabase-js` client boundary (inert until `EXPO_PUBLIC_SUPABASE_*` are set — Phase 1)
- ESLint (`eslint-config-expo`, flat config) + Prettier
- Jest (`jest-expo` preset) + React Native Testing Library

## Prerequisites

- Node.js 20+ and npm
- Xcode (iOS simulator builds) and/or Android Studio (Android emulator builds) for local native runs
- An Expo account + the [EAS CLI](https://docs.expo.dev/eas/) (`npm i -g eas-cli`) once you're building with EAS

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values as they become available
```

No environment variables are required to boot Phase 0 — `EXPO_PUBLIC_SUPABASE_URL`
and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are optional until the Supabase project exists
(Phase 1). `EXPO_PUBLIC_APP_ENV` defaults to `development`.

## Running

This app uses a **development build**, not Expo Go, because native modules
(`expo-dev-client`, and later `expo-notifications`/`expo-secure-store`) require one.

```bash
npx expo run:ios       # builds and launches a dev build on the iOS Simulator
npx expo run:android   # builds and launches a dev build on an Android emulator
npx expo start         # starts Metro once a dev build is installed
```

## Scripts

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test          # Jest
npm run format        # Prettier --write
npm run format:check  # Prettier --check
npm run verify        # format:check + lint + typecheck + test, in order
```

All four gates (`format:check`, `lint`, `typecheck`, `test`) pass as of this
commit — see the Phase 0 verification log below.

## Project structure

```
app/                  Expo Router routes (file-based)
  (auth)/              Role selection, sign-in, verify — shells only
  (customer)/          Customer tab experience — shells only
  (renter)/            Renter tab experience — shells only
  (shared)/            Notifications, support, legal — shells only
src/
  components/          ErrorBoundary, Screen, LoadingState/EmptyState/ErrorState
  design-system/        tokens.ts, ThemeProvider
  lib/                  env.ts, supabase.ts, result.ts, app-shell.tsx
```

`app-shell.tsx` is a **temporary, Phase-0-only** placeholder that lets you switch
between the customer/renter experience for manual QA before real auth exists. It
gets replaced by session/role state in Phase 1 (Prompt 3).

## App config and EAS

- `app.config.ts` — TypeScript app config. `ios.bundleIdentifier` / `android.package`
  are placeholders (`com.motorentmv.app`) — replace before any store submission or
  `eas init`. App name "MotoRent MV" is a working title per the PRD, pending
  branding validation.
- `eas.json` build profiles:
  - `development` — internal distribution, dev client, for physical devices
  - `development-simulator` — same, targeting the iOS Simulator
  - `preview` — internal distribution, production-like, for stakeholder testing
  - `production` — store-bound build

No EAS project is linked yet (`extra.eas.projectId` is unset) — run `eas init`
when ready to build.

## Known, accepted issues

- `npm audit` reports a moderate `uuid` advisory nested under Expo's own CLI/build
  tooling (`@expo/config-plugins` → `xcode` → `uuid`). This is a build-time
  dependency, never bundled into the app, and the only fix npm offers is a
  breaking downgrade to `expo@46`. Left as-is; revisit when upstream updates.
- `expo-doctor`'s two network-dependent checks (Expo config schema validation
  against a remote schema, and React Native Directory package metadata) fail in
  network-restricted environments. The other 19/21 checks pass. `app.config.ts`
  was independently validated locally via `expo config --type public`.
- `jest-expo@57.0.4`'s own transitive dependencies (`jest-environment-jsdom`,
  `@jest/globals`) are still on the Jest 29 line, so the project pins `jest` and
  `@types/jest` to `^29.7.0`/`^29.5.0` rather than the Jest 30 that `expo install`
  resolves by default — installing Jest 30 here causes a version-skewed
  `jest-mock` (nested vs. hoisted) and Jest crashes at the first test run.
- `.npmrc` sets `legacy-peer-deps=true`. `expo-router`'s optional web-preview
  dependencies (`@expo/ui`, `vaul`, `@radix-ui/*`) pin an exact `react-dom` patch
  that conflicts with npm's default (strict) peer resolution on a pure
  native project. This is a known ecosystem issue, not a project-specific bug.

## What's next

Schema (Prompt 2), auth/fleet (Prompt 3), the availability calendar and booking
engine (Prompt 4), customer discovery (Prompt 5), handover/payments/notifications
(Prompt 6), finance/reports (Prompt 7), CI/EAS automation (Prompt 8), and the
release-candidate/pilot handoff (Prompt 9) — see the PRD for full scope per phase.
