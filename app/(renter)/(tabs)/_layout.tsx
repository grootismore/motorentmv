import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '../../../src/design-system/ThemeProvider';

/**
 * The renter's 4-tab layout (Dashboard, Fleet, Bookings, More), rendered
 * by the OS's own native bottom-tab controller -- see
 * app/(customer)/(tabs)/_layout.tsx's doc comment for why this is a
 * NativeTabs group nested one level below the (renter) Stack.
 *
 * Previously 5 tabs (Today, Calendar, Bookings, Fleet, More). Today's
 * content is folded into the new Dashboard screen rather than kept as a
 * separate tab; Calendar moved to a pushed screen at /calendar (reachable
 * from the Dashboard's Today section and from More), since it's a
 * secondary view onto the same booking data Dashboard/Bookings already
 * show, not a primary landing surface of its own. Bookings does not use
 * `role="search"` -- it's an inbox/list, not a search surface, so it
 * stays a standard tab per the native-first rule's own "only if Search is
 * actually a primary tab" condition.
 *
 * (tabs) is a route group: it adds no path segment, so /dashboard,
 * /bookings, /fleet, /more are unchanged (and /calendar, now one level up,
 * is likewise unaffected by this group).
 */
export default function RenterTabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs tintColor={theme.colors.lagoonPrimary}>
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="dashboard" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="fleet/index">
        <NativeTabs.Trigger.Label>Fleet</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="car.fill" md="directions_car" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookings/index">
        <NativeTabs.Trigger.Label>Bookings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list_alt" />
      </NativeTabs.Trigger>
      {/* A plain 4th tab, not role="more": this "More" screen is the app's
          own settings/overflow content, not Apple's system-generated More
          list, so it must not adopt that role's aggregator behavior. */}
      <NativeTabs.Trigger name="more/index">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis.circle.fill" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
