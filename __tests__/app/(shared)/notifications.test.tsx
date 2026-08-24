import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../../src/design-system/ThemeProvider';
import Notifications from '../../../app/(shared)/notifications';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = jest.fn();
jest.mock('../../../src/features/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../src/features/notifications/service', () => ({
  expoNotificationService: {
    requestPermission: jest.fn().mockResolvedValue(true),
    scheduleTestNotification: jest.fn().mockResolvedValue('id'),
  },
}));

let NOTIFICATIONS: unknown[] = [];
let UNREAD_COUNT = 0;
const mockUpdateOne = jest.fn();
const mockUpdateAll = jest.fn();

function notificationsChain() {
  const chain = {
    select: (fields: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head) {
        return {
          eq: () => ({
            is: () => Promise.resolve({ count: UNREAD_COUNT, error: null }),
          }),
        };
      }
      return chain;
    },
    eq: () => chain,
    order: () => Promise.resolve({ data: NOTIFICATIONS, error: null }),
    update: (payload: unknown) => ({
      eq: (_col: string, id: string) => ({
        select: () => ({
          single: () => {
            mockUpdateOne(id);
            return Promise.resolve({
              data: {
                ...(NOTIFICATIONS.find((n) => (n as { id: string }).id === id) as object),
                ...(payload as object),
              },
              error: null,
            });
          },
        }),
        is: () => {
          mockUpdateAll();
          UNREAD_COUNT = 0;
          NOTIFICATIONS = NOTIFICATIONS.map((n) => ({ ...(n as object), read_at: '2026-08-05T11:00:00Z' }));
          return Promise.resolve({ error: null });
        },
      }),
    }),
  };
  return chain;
}

const mockFrom = jest.fn();
jest.mock('../../../src/lib/supabase', () => ({
  getSupabase: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
  NOTIFICATIONS = [];
  UNREAD_COUNT = 0;
});

function renderScreen() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'notifications') return notificationsChain();
    throw new Error(`unexpected table: ${table}`);
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <Notifications />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('Notifications screen', () => {
  it('shows the renter-attached note under a needs_info notification', async () => {
    mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } });
    NOTIFICATIONS = [
      {
        id: 'notif-1',
        recipient_id: 'user-1',
        type: 'booking_needs_info',
        payload: { booking_id: 'b-1', note: 'Please upload a clearer ID photo' },
        read_at: null,
        delivery_status: 'sent',
        delivered_at: null,
        created_at: '2026-08-05T10:00:00Z',
      },
    ];
    UNREAD_COUNT = 1;

    await renderScreen();

    expect(await screen.findByTestId('notification-note-notif-1')).toHaveTextContent(
      'Please upload a clearer ID photo',
    );
  });

  it('only shows "Mark all read" when there is at least one unread notification, and marks them all on press', async () => {
    mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } });
    NOTIFICATIONS = [
      {
        id: 'notif-1',
        recipient_id: 'user-1',
        type: 'booking_accepted',
        payload: { booking_id: 'b-1' },
        read_at: null,
        delivery_status: 'sent',
        delivered_at: null,
        created_at: '2026-08-05T10:00:00Z',
      },
    ];
    UNREAD_COUNT = 1;

    await renderScreen();

    const markAllButton = await screen.findByTestId('notifications-mark-all-read');
    await fireEvent.press(markAllButton);

    await waitFor(() => expect(mockUpdateAll).toHaveBeenCalled());
    // Wait for the invalidated unread-count query to refetch and settle --
    // the button hides itself once there is nothing left to mark read.
    await waitFor(() => expect(screen.queryByTestId('notifications-mark-all-read')).toBeNull());
  });

  it('does not show "Mark all read" when there are no unread notifications', async () => {
    mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } });
    NOTIFICATIONS = [];
    UNREAD_COUNT = 0;

    await renderScreen();

    await screen.findByTestId('notifications-send-test');
    expect(screen.queryByTestId('notifications-mark-all-read')).toBeNull();
  });
});
