import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/**
 * A screen-level "show an Offline state" signal, distinct from
 * query-client.ts's own NetInfo wiring (which only tells TanStack Query
 * when to pause/resume retries, not something a component can read).
 * Starts `false` (assume online) rather than `undefined`/loading, since
 * NetInfo's first real event can take a moment and a screen shouldn't
 * flash an offline state on every cold start.
 */
export function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      // `isConnected === false` is the only unambiguous "definitely
      // offline" signal NetInfo gives; `null`/`isInternetReachable ===
      // null` just means "still checking," which isn't the same thing.
      setIsOffline(state.isConnected === false);
    });
  }, []);

  return isOffline;
}
