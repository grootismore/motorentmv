import { Tabs } from 'expo-router';

import { useTheme } from '../../src/design-system/ThemeProvider';

export default function RenterLayout() {
  const theme = useTheme();

  return (
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
      <Tabs.Screen name="fleet/index" options={{ title: 'Fleet' }} />
      <Tabs.Screen name="more/index" options={{ title: 'More' }} />
    </Tabs>
  );
}
