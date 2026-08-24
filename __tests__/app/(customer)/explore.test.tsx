import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ThemeProvider } from '../../../src/design-system/ThemeProvider';
import Explore from '../../../app/(customer)/(tabs)/explore';

// Same "demo mode, Supabase not configured" simulation as
// search.demo-fallback.test.tsx -- this test only cares about the
// notifications bell/badge in the hero header, not real search results.
jest.mock('../../../src/lib/env', () => ({
  isDemoMode: true,
}));
jest.mock('../../../src/lib/supabase', () => ({
  isSupabaseConfigured: false,
  getSupabase: () => {
    throw new Error('Supabase is not configured.');
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  Link: ({ children }: PropsWithChildren) => children,
}));

const mockUseAuth = jest.fn();
jest.mock('../../../src/features/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseUnreadNotificationCount = jest.fn();
jest.mock('../../../src/features/notifications/queries', () => ({
  useUnreadNotificationCount: () => mockUseUnreadNotificationCount(),
}));

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
});

function renderExplore() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <Explore />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('Explore notifications bell', () => {
  it('shows no badge for a signed-out visitor', async () => {
    mockUseAuth.mockReturnValue({ session: null });
    mockUseUnreadNotificationCount.mockReturnValue({ data: undefined });

    await renderExplore();

    expect(await screen.findByTestId('explore-notifications-button')).toBeTruthy();
    expect(screen.queryByTestId('explore-notifications-badge')).toBeNull();
  });

  it('shows the unread count badge once signed in with unread notifications', async () => {
    mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } });
    mockUseUnreadNotificationCount.mockReturnValue({ data: 3 });

    await renderExplore();

    expect(await screen.findByTestId('explore-notifications-badge')).toHaveTextContent('3');
  });

  it('caps the badge label at "99+"', async () => {
    mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } });
    mockUseUnreadNotificationCount.mockReturnValue({ data: 140 });

    await renderExplore();

    expect(await screen.findByTestId('explore-notifications-badge')).toHaveTextContent('99+');
  });
});
