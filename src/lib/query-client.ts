import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * TanStack Query has no idea about RN's connectivity/foreground model out
 * of the box — on web it uses `navigator.onLine` and the `visibilitychange`
 * event, neither of which exist here. Without this wiring, queries never
 * automatically refetch when the app regains connectivity or comes back to
 * the foreground.
 */
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected));
  });
});

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

export function attachAppStateListener() {
  const subscription = AppState.addEventListener('change', onAppStateChange);
  return () => subscription.remove();
}

/**
 * `staleTime` is deliberately not 0: PRD §11 ("previously loaded Today/
 * booking detail remains readable" offline) means a screen should show its
 * last-known data immediately and refetch quietly in the background, not
 * blank out while reconnecting. Persisted alongside this in
 * `query-persister.ts` so the cache survives an app restart, not just a
 * screen revisit.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
    },
  },
});
