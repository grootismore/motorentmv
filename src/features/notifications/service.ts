import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

// Show a banner even while the app is in the foreground -- the default
// handler suppresses that, which would make the "send test notification"
// path below look broken when the app is open (the one place it's
// actually exercised in this sandbox). Set once at module load, same as
// every other expo-notifications app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Everything the app needs from push notifications, behind an interface
 * so no screen or hook imports expo-notifications directly -- a test
 * double or a future different provider swaps in without touching call
 * sites. expoNotificationService below is the only real implementation.
 */
export interface NotificationService {
  requestPermission(): Promise<boolean>;
  /** null if no push token could be obtained (no EAS project linked yet --
   * see app.config.ts's own `extra.eas.projectId` placeholder comment --
   * or the request failed, e.g. offline). Never throws. */
  getExpoPushToken(): Promise<string | null>;
  /** Schedules an immediate local notification -- the "test notification"
   * path: proves permission + presentation + the deep-link handler below
   * all work, without needing a real push round trip through Expo's
   * servers (which getExpoPushToken's own doc warns can fail offline). */
  scheduleTestNotification(input: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<string>;
  /** Fires when the user taps a notification (foreground, background, or
   * cold start via getLastNotificationResponse -- see the root listener
   * in app/_layout.tsx) with that notification's `data` payload. Returns
   * an unsubscribe function. */
  addNotificationResponseListener(handler: (data: Record<string, unknown>) => void): () => void;
}

export const expoNotificationService: NotificationService = {
  async requestPermission() {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  },

  async getExpoPushToken() {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return null;
    try {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      return token.data;
    } catch {
      return null;
    }
  },

  async scheduleTestNotification({ title, body, data }) {
    return Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
  },

  addNotificationResponseListener(handler) {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handler((response.notification.request.content.data ?? {}) as Record<string, unknown>);
    });
    return () => subscription.remove();
  },
};

/** Cold-start case: the app was launched *by* tapping a notification, so
 * no listener was registered yet to catch it. Read once at startup
 * alongside registering the live listener (app/_layout.tsx). */
export async function getLaunchNotificationData(): Promise<Record<string, unknown> | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  return (response.notification.request.content.data ?? {}) as Record<string, unknown>;
}
