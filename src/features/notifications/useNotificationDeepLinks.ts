import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { expoNotificationService, getLaunchNotificationData } from './service';

function navigateFromNotificationData(router: ReturnType<typeof useRouter>, data: Record<string, unknown>) {
  if (typeof data.booking_id === 'string') {
    router.push({ pathname: '/bookings/[bookingId]', params: { bookingId: data.booking_id } });
  }
}

/**
 * Registered once at the app root (app/_layout.tsx) so tapping a
 * notification deep-links into booking detail regardless of which screen
 * is active, or whether the tap cold-started the app (handled via
 * getLaunchNotificationData -- addNotificationResponseListener alone
 * only catches a tap that happens while this listener is already
 * registered). Pushes to the bare '/bookings/[bookingId]' path, which
 * Expo Router resolves to whichever of (renter)/(customer)'s own route is
 * currently mounted -- the same resolution BookingListItem's Link already
 * relies on (src/features/bookings/BookingListItem.tsx).
 */
export function useNotificationDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    getLaunchNotificationData().then((data) => {
      if (!cancelled && data) navigateFromNotificationData(router, data);
    });

    const unsubscribe = expoNotificationService.addNotificationResponseListener((data) => {
      navigateFromNotificationData(router, data);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);
}
