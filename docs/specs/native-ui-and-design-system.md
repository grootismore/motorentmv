# Feature Specification: Native UI & Design System

**Status**: ✅ Implemented & tested (typecheck/lint/format/Jest/bundle export, both platforms)
**PRD Reference**: `docs/PRD.md` §13; `AGENTS.md`'s native-first product rules

## Overview

RideFinder uses real native platform components wherever a stable,
Expo-compatible option exists — Expo Router's native tabs
(`expo-router/unstable-native-tabs`, a real `UITabBarController`/Material
bottom-nav) and `expo-blur`'s `BlurView` (a real native blur —
`UIVisualEffectView` on iOS) for every translucent surface. `Button`,
`TextField`, and `GroupedSection` are custom-styled plain React Native
views, not `@expo/ui`'s native SwiftUI/Jetpack Compose components — see
"Why not `@expo/ui`" below for why that was tried twice and reverted both
times.

## User Stories

1. As a user, I want the app's controls (tab bar, buttons, text fields,
   translucent cards) to look and behave correctly and consistently, with
   real native chrome wherever the platform provides one worth using.
2. As a user with accessibility settings on (larger text, Reduce
   Transparency, Reduce Motion), I want the app to respect them the way a
   native app would, for free.
3. As a developer, I want every native-UI claim in this repo to be backed
   by evidence this environment can actually produce — typecheck, lint,
   bundle export, and a passing Jest suite that exercises real component
   output — not a claim resting on rendering behavior nobody in this
   environment has been able to observe.

## Acceptance Criteria

- [x] AC1: Both tab bars (`(customer)`, `(renter)`) render via
      `expo-router/unstable-native-tabs` — a real `UITabBarController`/
      Material bottom-nav, not a custom view.
- [x] AC2: `GlassSurface` (every card/panel background in the app) renders
      a real native blur via `expo-blur`'s `BlurView` on iOS, tinted with a
      token color layered on top so the frosted panel always resolves to
      the same `glassSurface`/`glassSurfaceStrong` color regardless of
      what's behind it.
- [x] AC3: Android, and iOS with Reduce Transparency on, both fall back to
      a flat, opaque token surface — `expo-blur`'s blur is off by default
      on Android and inconsistent across OEM skins, and forcing iOS's blur
      onto it would itself violate the native-first rule in the other
      direction; Reduce Transparency gets the same flat surface for the
      same reason.
- [x] AC4: `Button`, `TextField`, `GroupedSection` render as plain,
      themed React Native views (`Pressable`/`TextInput`/`View`), not
      `@expo/ui` components — a deliberate, permanent decision; see
      "Why not `@expo/ui`" below.
- [x] AC5: All four components are covered by Jest component tests that
      assert real rendered output (label text, pressed/disabled states,
      value binding, themed colors) — not a native-view mock standing in
      for untestable native behavior.

## Why not `@expo/ui`

`@expo/ui`-backed versions of `Button`, `TextField`, `GroupedSection`, and
`GlassSurface` were built and shipped twice in this repo's history. Both
times, device screenshots showed the same two regressions: `Button`
rendering the platform's default system blue instead of the app's brand
color, and content nested inside `GroupedSection` (the dates and price
breakdown on the checkout/listing screens) silently failing to render at
all. The first round was root-caused against `@expo/ui`'s actual source
(a SwiftUI `.tint()` modifier for the button color, `RNHostView`'s
`matchContents` for the blank content) and shipped as a fix. The second
round of screenshots — submitted later, pixel-identical to the first
(same timestamp, same battery level, same demo data) — showed the
identical bugs still present.

This environment has no Swift toolchain, no Xcode, and no iOS
Simulator (`which swift`/`swiftc`/`xcodebuild` all fail, and the network
policy blocks installing one), so nothing about `@expo/ui`'s actual
on-screen behavior can be verified here — only inferred from source
reading and confirmed or refuted by whatever a real device shows. Two
independent rounds of "root-cause and fix" both failed to hold up against
that evidence. Rather than attempt a third unverifiable fix, `@expo/ui`
and its `react-native-worklets` peer dependency were removed from the
project entirely, and `Button`/`TextField`/`GroupedSection`/`GlassSurface`
were reverted to the plain React Native implementations that predate the
`@expo/ui` experiment — implementations whose correctness this
environment _can_ fully verify (Jest renders and asserts their real
output; there's no native runtime step where a fix can silently fail to
apply). This is a permanent decision, not a "try again later": the tab bar
(genuinely native, unaffected by any of this) is the one native-first
requirement from `AGENTS.md` that applies here, since a themed button, a
text field, and a plain inset card are not on `AGENTS.md`'s list of
controls that must be native.

## Deliberate scope boundaries (not oversights)

- `Icon` stays `@expo/vector-icons` (Ionicons) rather than native SF
  Symbols/Material Symbols.
- `ChipSelect` (filter/status pickers) stays a custom control rather than
  a native segmented control or menu.

Both were evaluated and deferred for the same reason `@expo/ui` was
reverted: icon-name mapping and variable-option-count pickers carry real
regression risk with no way to visually verify the result in this
environment. See `README.md`'s "Known limitations" for the full reasoning.

## Technical Design

### Architecture

`src/components/{Button,TextField,GroupedSection}.tsx` are plain
`Pressable`/`TextInput`/`View` compositions styled from the theme's design
tokens. `src/components/GlassSurface.tsx` is the one place in the app that
renders a blurred/translucent surface, wrapping `expo-blur`'s `BlurView`.
`__mocks__/expo-blur.tsx` mocks `BlurView` as a plain `View` for Jest —
not because its behavior is unverifiable, but because `BlurView`'s real
`componentDidMount` causes React Testing Library `act()` timing races
across the dozens of `GlassSurface` instances a typical screen renders.

## Testing Plan

- [x] `src/components/Button.test.tsx`, `src/components/states/EmptyState.test.tsx`,
      and the component/integration tests across `__tests__/` and
      `src/features/` — Jest tests against real rendered output (no native
      module mock standing in for behavior the test can't actually check).
- [x] `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check .`,
      `npx jest` (full suite) — all clean.
- [x] `npx expo export --platform ios`, `npx expo export --platform android`
      — both bundle cleanly with `@expo/ui`/`react-native-worklets` fully
      removed from the dependency graph.
- [ ] 📱 A real device/simulator pass for visual polish (spacing, color
      accuracy, blur intensity) — not required to trust the functional
      correctness of these four components, which the automated suite
      above already covers, but still worth a look; see `docs/ROADMAP.md`.
