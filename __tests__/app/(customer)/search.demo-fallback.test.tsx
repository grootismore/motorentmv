import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ThemeProvider } from '../../../src/design-system/ThemeProvider';
import Search from '../../../app/(customer)/(tabs)/search';

// Simulates reviewing this build with EXPO_PUBLIC_DEMO_MODE=true and no
// EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY set at all --
// getSupabase() would throw "Supabase is not configured." before ever
// reaching the RPC, so the mock never needs `rpc` to resolve anything.
jest.mock('../../../src/lib/env', () => ({
  isDemoMode: true,
}));
jest.mock('../../../src/lib/supabase', () => ({
  isSupabaseConfigured: false,
  getSupabase: () => {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    location: 'Male',
    startsAt: '2026-09-01T04:00:00.000Z',
    endsAt: '2026-09-02T04:00:00.000Z',
  }),
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  Link: ({ children }: PropsWithChildren) => children,
}));

let client: QueryClient;

afterEach(() => {
  client.unmount();
});

function renderSearch() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <Search />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('Search screen demo fallback (Supabase not configured, demo mode on)', () => {
  it('shows demo cards instead of the "Supabase is not configured" error', async () => {
    await renderSearch();

    expect(await screen.findByTestId('vehicle-result-demo-1')).toBeTruthy();
    expect(screen.queryByText(/Supabase is not configured/)).toBeNull();
  });
});
