import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Placeholder identifiers — replace before any store submission or EAS project link:
 *  - `owner` / `slug` once the Expo account/org is decided
 *  - `ios.bundleIdentifier` / `android.package` once the final app id is chosen
 *  - `extra.eas.projectId` after running `eas init`
 *
 * Renamed from "MotoRent MV" to "RideFinder" -- the bundle identifier
 * changed too (com.motorentmv.app -> com.ridefinder.app), not just the
 * display name, so a sideloading tool that had any stale state tied to
 * the old bundle id treats this as a genuinely new, unrelated app.
 */
const BUNDLE_ID = 'com.ridefinder.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'RideFinder',
  slug: 'ridefinder',
  scheme: 'ridefinder',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    // CFBundleVersion. Left at the fixed default ('1') for local/EAS
    // builds, but the CI-built review IPA overrides this via
    // IOS_BUILD_NUMBER (see .github/workflows/ios-unsigned-device.yml) so
    // every review build carries a distinct, increasing build number --
    // without this, every review IPA reported the exact same
    // CFBundleVersion, and a sideloading tool doing an in-place
    // reinstall (rather than delete-then-install) can decide there's
    // nothing to update and silently keep running the previous binary.
    buildNumber: process.env.IOS_BUILD_NUMBER,
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-image',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow RideFinder to access your photos to add vehicle and inspection pictures.',
        cameraPermission: 'Allow RideFinder to access your camera to take vehicle and inspection pictures.',
        microphonePermission: false,
      },
    ],
    // NOT in this list: 'expo-notifications'. Its config plugin
    // (node_modules/expo-notifications/plugin/build/withNotificationsIOS.js)
    // unconditionally adds `aps-environment` to the iOS entitlements and
    // `remote-notification` to UIBackgroundModes whenever it runs -- there
    // is no option to suppress this. A Push Notifications entitlement can
    // only be granted by a paid Apple Developer Program provisioning
    // profile; a free personal-team profile (what Sideloadly/AltStore/
    // SideStore resign with) cannot include it. The mismatch between what
    // the app requests and what the resigning profile can grant is
    // rejected by the device's own `installd` at install time -- this is
    // the real cause of every "Service operation failed: Failed to install
    // IPA" / Minimuxer.IdeviceGatewayError this project hit, on both the
    // pre-rename and post-rename bundle identifier (the rename never could
    // have fixed this; the entitlement issue is bundle-id-independent).
    // The `expo-notifications` *package* is untouched and still imported
    // directly by src/features/notifications/service.ts -- local
    // notifications, permission requests, and the response listener all
    // work via the native module's own autolinking, independent of this
    // config plugin. Only real remote push delivery needs it, and this
    // project doesn't have a paid Apple Developer account or a linked EAS
    // project to receive real push tokens yet (see README). Re-add this
    // plugin once both of those exist and this app is being distributed
    // through TestFlight/App Store/EAS rather than free-account sideloading.
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Populated by `eas init`; left unset until an EAS project is created.
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
    // Safe diagnostic metadata only (no secrets, no tokens) -- lets a
    // sideloaded IPA be traced back to the exact GitHub Actions run and
    // commit that produced it, surfaced via Constants.expoConfig.extra.build
    // wherever the app wants to show it (e.g. a hidden tap-to-reveal
    // build-info row). All fields are undefined outside CI/EAS, since none
    // of these env vars exist locally.
    build: {
      commit: process.env.GITHUB_SHA?.slice(0, 7),
      branch: process.env.GITHUB_REF_NAME,
      runNumber: process.env.GITHUB_RUN_NUMBER,
      profile: process.env.BUILD_PROFILE,
      builtAt: new Date().toISOString(),
    },
  },
});
