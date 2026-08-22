import { Tabs } from 'expo-router';

import { oceanTabBarIcon, useOceanTabBarScreenOptions } from '../../src/components/oceanTabBar';
import { LoadingState } from '../../src/components/states/LoadingState';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { CreateOrganizationScreen } from '../../src/features/organizations/CreateOrganizationScreen';
import { CurrentOrganizationProvider } from '../../src/features/organizations/CurrentOrganizationContext';
import { useMyMembership } from '../../src/features/organizations/queries';

export default function RenterLayout() {
  const screenOptions = useOceanTabBarScreenOptions();
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
      <Tabs initialRouteName="today" screenOptions={screenOptions}>
        <Tabs.Screen
          name="today"
          options={{ title: 'Today', tabBarIcon: oceanTabBarIcon('today-outline', 'today') }}
        />
        <Tabs.Screen
          name="calendar"
          options={{ title: 'Calendar', tabBarIcon: oceanTabBarIcon('calendar-outline', 'calendar') }}
        />
        <Tabs.Screen
          name="bookings/index"
          options={{ title: 'Bookings', tabBarIcon: oceanTabBarIcon('list-outline', 'list') }}
        />
        <Tabs.Screen name="bookings/[bookingId]" options={{ href: null }} />
        <Tabs.Screen
          name="fleet/index"
          options={{ title: 'Fleet', tabBarIcon: oceanTabBarIcon('car-sport-outline', 'car-sport') }}
        />
        <Tabs.Screen
          name="more/index"
          options={{
            title: 'More',
            tabBarIcon: oceanTabBarIcon('ellipsis-horizontal-circle-outline', 'ellipsis-horizontal-circle'),
          }}
        />
        <Tabs.Screen name="fleet/[vehicleId]/index" options={{ href: null }} />
        <Tabs.Screen name="fleet/[vehicleId]/edit" options={{ href: null }} />
        <Tabs.Screen name="fleet/new" options={{ href: null }} />
        <Tabs.Screen name="more/staff" options={{ href: null }} />
      </Tabs>
    </CurrentOrganizationProvider>
  );
}
