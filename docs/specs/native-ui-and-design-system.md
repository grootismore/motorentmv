# Feature Specification: Native UI & Design System

**Status**: ✅ Implemented & tested (typecheck/bundle/Jest) / 📱 needs device validation (all visual/interaction behavior)
**PRD Reference**: `docs/PRD.md` §13; `AGENTS.md`'s native-first product rules

## Overview

RideFinder uses real native platform components wherever a stable, Expo-compatible option exists, rather than custom-drawn views that resemble them — Expo Router's native tabs, `@expo/ui`-backed content primitives, and SwiftUI's real Liquid Glass material for every translucent surface.

## User Stories

1. As a user, I want the app's controls (tab bar, buttons, text fields, translucent cards) to look and behave like real iOS/Android system components, not an approximation.
2. As a user with accessibility settings on (larger text, Reduce Transparency, Reduce Motion), I want the app to respect them the way a native app would, for free.
3. As a developer, I want a device build's real rendering to be the source of truth for whether a native-UI change works — not a green Jest suite alone, which can't exercise the real SwiftUI/Compose runtime.

## Acceptance Criteria

- [x] AC1: Both tab bars (`(customer)`, `(renter)`) render via `expo-router/unstable-native-tabs` — a real `UITabBarController`/Material bottom-nav, not a custom view.
- [x] AC2: `Button`, `TextField`, `GroupedSection` render via `@expo/ui` (real SwiftUI/Jetpack Compose views).
- [x] AC3: `GlassSurface` (every card/panel background in the app) renders SwiftUI's real `.glassEffect()` material on iOS.
- [x] AC4: Android and iOS-with-Reduce-Transparency both fall back to a flat, opaque token surface — forcing iOS's Liquid Glass onto Android, or ignoring Reduce Transparency, would each violate the native-first rule in the opposite direction.
- [x] AC5: Two real device-build bugs are root-caused and fixed: `Button`'s `style.backgroundColor` never painted a `.borderedProminent`/`.bordered` button's own chrome (fixed with SwiftUI's `.tint()` modifier, iOS only — the Universal Android `Button` has no equivalent color prop); `GroupedSection`'s `RNHostView` bridge defaulted to zero height inside a `FieldGroup.Section` row (fixed with `matchContents`).
- [ ] 📱 AC6 (unverified): the actual on-screen appearance and feel of every item above — this is the entire remaining scope of this spec, not a partial gap. See "Environment constraints" in `docs/PRD.md`.

## Technical Design

### Architecture

`src/components/{Button,TextField,GroupedSection,GlassSurface}.tsx` wrap `@expo/ui` primitives behind the same external prop API their pre-native-rewrite versions had, so screen code didn't need to change shape. `jest.setup.ts` mocks `expo`'s `requireNativeModule('ExpoUI')` — the one native-state mechanism (`useNativeState`) RN's generic native-view-manager auto-mock doesn't cover on its own.

### Deliberate scope boundaries (not oversights)

- `Icon` stays `@expo/vector-icons` (Ionicons) rather than native SF Symbols/Material Symbols.
- `ChipSelect` (filter/status pickers) stays a custom control rather than a native segmented control or menu.

Both were evaluated and deferred: icon-name mapping and variable-option-count pickers carry real regression risk with no way to visually verify the result in this environment. See `README.md`'s "Known limitations" for the full reasoning.

## Testing Plan

- [x] `src/components/Button.test.tsx`, `src/components/states/EmptyState.test.tsx` — Jest component tests (native views render via RN's generic native-view-manager mock, not the real SwiftUI/Compose runtime — this is why AC6 is still 📱, not ✅, no matter how many of these pass).
- [x] `npx tsc --noEmit`, `npx expo export` (both iOS and Android) — confirms the whole `@expo/ui` module graph resolves and nothing crashes at bundle time.
- [ ] 📱 A real device/simulator pass — the single highest-priority item in `docs/ROADMAP.md`, since this is the one feature area where "code exists and compiles" and "actually works" have historically diverged (see AC5's two real bugs, both only found on an actual device build).
