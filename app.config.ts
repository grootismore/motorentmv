import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Placeholder identifiers — replace before any store submission or EAS project link:
 *  - `owner` / `slug` once the Expo account/org is decided
 *  - `ios.bundleIdentifier` / `android.package` once the final app id is chosen
 *  - `extra.eas.projectId` after running `eas init`
 *  - app name/branding: PRD marks "MotoRent MV" as a working title pending validation
 */
const BUNDLE_ID = 'com.motorentmv.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MotoRent MV',
  slug: 'motorentmv',
  scheme: 'motorentmv',
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
        photosPermission: 'Allow MotoRent MV to access your photos to add vehicle and inspection pictures.',
        cameraPermission: 'Allow MotoRent MV to access your camera to take vehicle and inspection pictures.',
        microphonePermission: false,
      },
    ],
    // No icon/color override: defaults to the app icon, since no dedicated
    // monochrome notification-icon asset exists yet (same "replace before
    // store submission" placeholder spirit as BUNDLE_ID above).
    'expo-notifications',
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
