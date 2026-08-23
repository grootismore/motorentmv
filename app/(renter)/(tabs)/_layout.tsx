import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '../../../src/design-system/ThemeProvider';

/**
 * The renter's real 5-tab layout, rendered by the OS's own native
 * bottom-tab controller -- see app/(customer)/(tabs)/_layout.tsx's doc
 * comment for why this is a NativeTabs group nested one level below the
 * (renter) Stack, rather than the customer bar's own former custom
 * tabBarButton/tabBarBackground approach (src/components/oceanTabBar.tsx,
 * now removed).
 *
 * (tabs) is a route group: it adds no path segment, so /today, /calendar,
 * /bookings, /fleet, /more are unchanged.
 */
export default function RenterTabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs tintColor={theme.colors.lagoonPrimary}>
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="dashboard" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookings/index">
        <NativeTabs.Trigger.Label>Bookings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list_alt" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="fleet/index">
        <NativeTabs.Trigger.Label>Fleet</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="car.fill" md="directions_car" />
      </NativeTabs.Trigger>
      {/* A plain 5th tab, not role="more": this "More" screen is the app's
          own settings/overflow content, not Apple's system-generated More
          list, so it must not adopt that role's aggregator behavior. Five
          tabs fit iOS's native bar without any overflow collapsing. */}
      <NativeTabs.Trigger name="more/index">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis.circle.fill" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
