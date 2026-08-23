import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '../../../src/design-system/ThemeProvider';

/**
 * The customer's real 4-tab layout, rendered by the OS's own native
 * bottom-tab controller (UITabBarController on iOS, the Material 3
 * bottom-nav-bar / gamma tabs host on Android) via react-native-screens'
 * TabsHost, which Expo Router SDK 57 wires up as NativeTabs -- no
 * BlurView, no absolute positioning, no manually computed safe-area
 * offsets. The OS owns placement, safe-area/home-indicator spacing,
 * glass material, and the Search tab's separated presentation.
 *
 * Lives in its own (tabs) group, one level below app/(customer)/_layout.tsx
 * (a Stack), because a native tab bar cannot host "hidden" push-only
 * screens as peer tabs -- see that Stack's own doc comment for why.
 * (tabs) is a route group: it adds no path segment, so /explore, /search,
 * /bookings, /profile are unchanged.
 */
export default function CustomerTabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs tintColor={theme.colors.lagoonPrimary}>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="safari.fill" md="explore" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookings/index">
        <NativeTabs.Trigger.Label>Bookings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile/index">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
      {/* role="search" is what gives Search its native separated/detached
          presentation on iOS (the "Renata" look) -- the OS does this, not
          a custom circle view. On Android and older iOS this falls back
          to a normal 4th tab; SUPPORTED_TAB_BAR_ITEM_ROLES confirms
          "search" is a real, currently-supported role, not a guess. */}
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
