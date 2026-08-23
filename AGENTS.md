# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Native-first product rules

MotoRent MV must use native platform components and behavior whenever a
stable, Expo-compatible native option exists.

The goal is not to draw controls that resemble iOS. The goal is to invoke
the real native components supplied by iOS and Android.

On iOS, prefer:

- Native bottom tabs
- Native navigation bars and large titles
- Native SF Symbols
- Native search presentation
- Native sheets and page sheets
- Native alerts and confirmation dialogs
- Native context menus
- Native date and time pickers
- Native switches
- Native segmented controls where available
- Native sharing sheet
- Native document and image pickers
- Native keyboard types and autofill
- Native haptics
- Native accessibility semantics
- Native pull-to-refresh
- Native scroll behavior
- Native system glass/material effects
- Native status-bar and safe-area behavior

On Android, use the corresponding stable native Material/platform behavior.

Do not:

- Recreate native controls using arbitrary Views
- Manually draw iOS glass
- Use BlurView to imitate a native component that already exists
- Hardcode home-indicator padding
- Build custom alerts when native alerts are sufficient
- Build custom date/time wheels
- Use custom dropdowns where a native menu or sheet is appropriate
- Use custom toast notifications for critical confirmations
- Copy private or undocumented Apple APIs
- Force iOS visual behavior onto Android
- Add heavy UI libraries merely to imitate native controls

Native dependencies require Expo development builds or EAS/native builds.
Do not evaluate native functionality inside Expo Go when Expo Go cannot
include the required module.

Before adding a native dependency:

1. Check the current Expo SDK and React Native versions.
2. Check compatibility.
3. Prefer packages supported by Expo or already used successfully in the app.
4. Explain why the dependency is required.
5. Avoid adding overlapping packages providing the same capability.
6. Rebuild the native application after installation.
7. Provide a graceful platform fallback where needed.

Preserve all completed business logic, API contracts, routes, Supabase
security, booking behavior and existing data.
