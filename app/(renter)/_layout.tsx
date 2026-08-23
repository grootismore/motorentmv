import { Stack } from 'expo-router';

import { LoadingState } from '../../src/components/states/LoadingState';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { CreateOrganizationScreen } from '../../src/features/organizations/CreateOrganizationScreen';
import { CurrentOrganizationProvider } from '../../src/features/organizations/CurrentOrganizationContext';
import { useMyMembership } from '../../src/features/organizations/queries';

/**
 * Wraps the real native tab bar ((tabs)/_layout.tsx) plus the detail
 * routes that must not be tabs -- bookings/[bookingId], fleet/[vehicleId]
 * (view + edit), fleet/new, and more/staff are pushed to from inside a
 * tab and need to cover it full screen. See
 * app/(customer)/_layout.tsx's doc comment for why a native tab bar
 * requires this Stack-plus-(tabs)-group shape instead of the old
 * Tabs.Screen + href:null trick.
 *
 * This is a route group, not a URL segment: /today, /calendar,
 * /bookings, /fleet, /more, and every detail route keep their exact
 * existing paths. The membership gate (loading / create-organization /
 * CurrentOrganizationProvider) is unchanged.
 */
export default function RenterLayout() {
  const { session } = useAuth();
  const membership = useMyMembership(session?.user.id);

  if (membership.isLoading) {
    return <LoadingState label="Loading your business…" />;
  }

  if (!membership.data) {
    return <CreateOrganizationScreen />;
  }

  return (
    <CurrentOrganizationProvider membership={membership.data}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bookings/[bookingId]" />
        <Stack.Screen name="fleet/[vehicleId]/index" />
        <Stack.Screen name="fleet/[vehicleId]/edit" />
        <Stack.Screen name="fleet/new" />
        <Stack.Screen name="more/staff" />
      </Stack>
    </CurrentOrganizationProvider>
  );
}
