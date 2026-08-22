import { Tabs } from 'expo-router';

import { oceanTabBarIcon, useOceanTabBarScreenOptions } from '../../src/components/oceanTabBar';

export default function CustomerLayout() {
  const screenOptions = useOceanTabBarScreenOptions();

  return (
    <Tabs initialRouteName="explore" screenOptions={screenOptions}>
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explore', tabBarIcon: oceanTabBarIcon('compass-outline', 'compass') }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Search', tabBarIcon: oceanTabBarIcon('search-outline', 'search') }}
      />
      <Tabs.Screen
        name="bookings/index"
        options={{ title: 'Bookings', tabBarIcon: oceanTabBarIcon('calendar-outline', 'calendar') }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{ title: 'Profile', tabBarIcon: oceanTabBarIcon('person-outline', 'person') }}
      />
      <Tabs.Screen name="listing/[vehicleId]" options={{ href: null }} />
      <Tabs.Screen name="checkout/[vehicleId]" options={{ href: null }} />
      <Tabs.Screen name="bookings/[bookingId]" options={{ href: null }} />
    </Tabs>
  );
}
