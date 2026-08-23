import { Tabs } from 'expo-router';

import { CustomerGlassTabBar, type CustomerGlassTabBarProps } from '../../src/components/CustomerGlassTabBar';

export default function CustomerLayout() {
  return (
    <Tabs
      initialRouteName="explore"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        // React Navigation's real navigation.emit is generic over a fixed
        // set of event-name literals ('tabPress' | 'tabLongPress' | ...);
        // CustomerGlassTabBarProps intentionally widens that to a plain
        // `string` so the component doesn't need to import/depend on that
        // internal event-map type. The two call sites inside the component
        // only ever pass 'tabPress'/'tabLongPress', both valid members of
        // the real union, so this is a type-level widening only -- nothing
        // unsafe happens at runtime.
        <CustomerGlassTabBar {...(props as unknown as CustomerGlassTabBarProps)} />
      )}
    >
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="bookings/index" options={{ title: 'Bookings' }} />
      <Tabs.Screen name="profile/index" options={{ title: 'Profile' }} />
      <Tabs.Screen name="listing/[vehicleId]" options={{ href: null }} />
      <Tabs.Screen name="checkout/[vehicleId]" options={{ href: null }} />
      <Tabs.Screen name="bookings/[bookingId]" options={{ href: null }} />
    </Tabs>
  );
}
