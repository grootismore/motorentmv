import { Tabs } from 'expo-router';

import { oceanTabBarButton, useOceanTabBarScreenOptions } from '../../src/components/oceanTabBar';

export default function CustomerLayout() {
  const screenOptions = useOceanTabBarScreenOptions();

  return (
    <Tabs initialRouteName="explore" screenOptions={screenOptions}>
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarButton: oceanTabBarButton('compass-outline', 'compass', 'Explore'),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Search', tabBarButton: oceanTabBarButton('search-outline', 'search', 'Search') }}
      />
      <Tabs.Screen
        name="bookings/index"
        options={{
          title: 'Bookings',
          tabBarButton: oceanTabBarButton('calendar-outline', 'calendar', 'Bookings'),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{ title: 'Profile', tabBarButton: oceanTabBarButton('person-outline', 'person', 'Profile') }}
      />
      <Tabs.Screen name="listing/[vehicleId]" options={{ href: null }} />
      <Tabs.Screen name="checkout/[vehicleId]" options={{ href: null }} />
      <Tabs.Screen name="bookings/[bookingId]" options={{ href: null }} />
    </Tabs>
  );
}
