import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { LoadingState } from '../src/components/states/LoadingState';
import { ThemeProvider, useTheme } from '../src/design-system/ThemeProvider';
import { AuthProvider } from '../src/features/auth/AuthProvider';
import { ExperienceIntentProvider } from '../src/features/auth/experience-intent';
import { useAppGate } from '../src/features/auth/useAppGate';
import { useNotificationDeepLinks } from '../src/features/notifications/useNotificationDeepLinks';
import { attachAppStateListener, queryClient } from '../src/lib/query-client';
import { queryPersister, shouldPersistQuery } from '../src/lib/query-persister';

function RootNavigator() {
  const gate = useAppGate();
  const theme = useTheme();
  useNotificationDeepLinks();

  if (gate === 'loading') {
    return <LoadingState label="Loading your account…" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Protected guard={gate === 'auth'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={gate === 'customer'}>
        <Stack.Screen name="(customer)" />
      </Stack.Protected>
      <Stack.Protected guard={gate === 'renter'}>
        <Stack.Screen name="(renter)" />
      </Stack.Protected>
      <Stack.Screen name="(shared)" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => attachAppStateListener(), []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
          }}
        >
          <AuthProvider>
            <ExperienceIntentProvider>
              <ErrorBoundary>
                <StatusBar style="auto" />
                <RootNavigator />
              </ErrorBoundary>
            </ExperienceIntentProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
