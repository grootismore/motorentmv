import { Stack } from 'expo-router';

/**
 * Wraps the real native tab bar ((tabs)/_layout.tsx) plus the three
 * detail routes that must NOT be tabs: listing/[vehicleId],
 * checkout/[vehicleId], and bookings/[bookingId] are pushed to from
 * inside a tab (a result card, a booking row) and need to render full
 * screen, covering the tab bar -- the same "push covers the tab bar"
 * behavior every native tab-bar app has.
 *
 * They can't be registered as NativeTabs children the way the old
 * Tabs.Screen + href:null did it: a native tab that's `hidden` cannot
 * become the focused route at all (expo-router's NativeBottomTabsNavigator
 * throws in dev, and silently snaps back to the first tab in production,
 * if the currently-focused route resolves to a hidden tab) -- there is no
 * native equivalent of a JS tab silently rendering full-screen while
 * staying out of the tab strip. A wrapping Stack is the standard, and
 * only, way to get that behavior with a real native tab bar: Stack.Screen
 * "(tabs)" is the 4-tab root, and the three detail routes are ordinary
 * stack pushes on top of it.
 *
 * This is a route group, not a URL segment, so /explore, /search,
 * /bookings, /profile, /listing/[id], /checkout/[id], /bookings/[id] are
 * all unchanged.
 */
export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="listing/[vehicleId]" />
      <Stack.Screen name="checkout/[vehicleId]" />
      <Stack.Screen name="bookings/[bookingId]" />
    </Stack>
  );
}
