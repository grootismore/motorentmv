import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { expoNotificationService, getLaunchNotificationData } from './service';

// jest.mock calls are hoisted above these imports by babel-plugin-jest-hoist
// regardless of source position -- written after the imports here (rather
// than before, as usual) so eslint's import/first rule is satisfied too.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: undefined as string | undefined } } } },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

function setProjectId(projectId: string | undefined) {
  (
    Constants as unknown as { expoConfig: { extra: { eas: { projectId?: string } } } }
  ).expoConfig.extra.eas.projectId = projectId;
}

// Captured immediately after import, before any beforeEach clears mock call
// history: setNotificationHandler is a module-load side effect (service.ts
// top level), so by the time the first `it()` runs it would otherwise
// already have been wiped.
const notificationHandlerCallArgs = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0];

describe('expoNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setProjectId(undefined);
  });

  it('sets a foreground notification handler at module load', () => {
    expect(notificationHandlerCallArgs?.[0]).toEqual(
      expect.objectContaining({ handleNotification: expect.any(Function) }),
    );
  });

  it('requestPermission skips the prompt if already granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });

    const granted = await expoNotificationService.requestPermission();

    expect(granted).toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requestPermission prompts when not already granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });

    const granted = await expoNotificationService.requestPermission();

    expect(granted).toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('getExpoPushToken returns null without throwing when no EAS project is linked', async () => {
    setProjectId(undefined);

    const token = await expoNotificationService.getExpoPushToken();

    expect(token).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('getExpoPushToken returns null (not a throw) when the request itself fails, e.g. offline', async () => {
    setProjectId('proj-123');
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(new Error('network request failed'));

    const token = await expoNotificationService.getExpoPushToken();

    expect(token).toBeNull();
  });

  it('getExpoPushToken returns the token data when a project is linked and the request succeeds', async () => {
    setProjectId('proj-123');
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'ExponentPushToken[abc]' });

    const token = await expoNotificationService.getExpoPushToken();

    expect(token).toBe('ExponentPushToken[abc]');
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-123' });
  });

  it('scheduleTestNotification schedules an immediate (trigger: null) local notification', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notif-1');

    const id = await expoNotificationService.scheduleTestNotification({ title: 'Hi', body: 'There' });

    expect(id).toBe('notif-1');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Hi', body: 'There', data: undefined },
      trigger: null,
    });
  });

  it('addNotificationResponseListener extracts the data payload and returns an unsubscribe function', () => {
    const remove = jest.fn();
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation(
      (cb: (response: unknown) => void) => {
        cb({ notification: { request: { content: { data: { booking_id: 'b1' } } } } });
        return { remove };
      },
    );
    const handler = jest.fn();

    const unsubscribe = expoNotificationService.addNotificationResponseListener(handler);

    expect(handler).toHaveBeenCalledWith({ booking_id: 'b1' });
    unsubscribe();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe('getLaunchNotificationData', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when the app was not launched by a notification tap', async () => {
    (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValue(null);

    expect(await getLaunchNotificationData()).toBeNull();
  });

  it('returns the data payload when the app was cold-started by a notification tap', async () => {
    (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValue({
      notification: { request: { content: { data: { booking_id: 'b2' } } } },
    });

    expect(await getLaunchNotificationData()).toEqual({ booking_id: 'b2' });
  });
});
