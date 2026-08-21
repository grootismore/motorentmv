import { Tabs } from 'expo-router';

import { LoadingState } from '../../src/components/states/LoadingState';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { CreateOrganizationScreen } from '../../src/features/organizations/CreateOrganizationScreen';
import { CurrentOrganizationProvider } from '../../src/features/organizations/CurrentOrganizationContext';
import { useMyMembership } from '../../src/features/organizations/queries';

export default function RenterLayout() {
  const theme = useTheme();
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
      <Tabs
        initialRouteName="today"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border },
        }}
      >
        <Tabs.Screen name="today" options={{ title: 'Today' }} />
        <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
        <Tabs.Screen name="bookings/index" options={{ title: 'Bookings' }} />
        <Tabs.Screen name="bookings/[bookingId]" options={{ href: null }} />
        <Tabs.Screen name="fleet/index" options={{ title: 'Fleet' }} />
        <Tabs.Screen name="more/index" options={{ title: 'More' }} />
        <Tabs.Screen name="fleet/[vehicleId]/index" options={{ href: null }} />
        <Tabs.Screen name="fleet/[vehicleId]/edit" options={{ href: null }} />
        <Tabs.Screen name="fleet/new" options={{ href: null }} />
        <Tabs.Screen name="more/staff" options={{ href: null }} />
      </Tabs>
    </CurrentOrganizationProvider>
  );
}
