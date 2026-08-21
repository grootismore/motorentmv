import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from '../src/design-system/ThemeProvider';
import { AppShellProvider, useAppShell } from '../src/lib/app-shell';

function RootNavigator() {
  const { experience } = useAppShell();
  const theme = useTheme();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Protected guard={experience === null}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={experience === 'customer'}>
        <Stack.Screen name="(customer)" />
      </Stack.Protected>
      <Stack.Protected guard={experience === 'renter'}>
        <Stack.Screen name="(renter)" />
      </Stack.Protected>
      <Stack.Screen name="(shared)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShellProvider>
          <ErrorBoundary>
            <StatusBar style="auto" />
            <RootNavigator />
          </ErrorBoundary>
        </AppShellProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
