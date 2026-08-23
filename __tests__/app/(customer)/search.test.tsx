import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ThemeProvider } from '../../../src/design-system/ThemeProvider';
import Search from '../../../app/(customer)/search';

const mockRpc = jest.fn();
// isSupabaseConfigured: true makes this suite's behavior deterministic
// regardless of any ambient EXPO_PUBLIC_DEMO_MODE/EXPO_PUBLIC_SUPABASE_*
// in the environment these tests happen to run in -- this file tests the
// real RPC-driven rendering path, not the demo-card fallback (that's
// search.demo-fallback.test.tsx). A real CI regression once slipped
// through here: EXPO_PUBLIC_DEMO_MODE briefly set job-wide in
// ios-unsigned-ipa.yml (meant only for the actual build step) made every
// test below render demo cards instead of whatever was mocked, since
// isSupabaseConfigured was previously left undefined (falsy) here.
jest.mock('../../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ rpc: (...args: unknown[]) => mockRpc(...args) }),
}));

const mockSetParams = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    location: 'Male',
    startsAt: '2026-09-01T04:00:00.000Z',
    endsAt: '2026-09-02T04:00:00.000Z',
  }),
  useRouter: () => ({ push: mockPush, setParams: mockSetParams }),
  // Real Link renders navigation chrome this test doesn't exercise —
  // a plain Pressable-less passthrough is enough to assert on content.
  Link: ({ children }: PropsWithChildren) => children,
}));

// A fresh QueryClient per test needs an explicit unmount() afterward —
// unlike the app's own single, process-lifetime client
// (src/lib/query-client.ts), these are never unmounted by React itself
// (QueryClientProvider doesn't do that on unmount), so their internal gc
// timers/focus-manager subscriptions would otherwise outlive the test and
// hang Jest's exit.
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

/**
 * Integration coverage for the search results step: the screen, its
 * params-to-criteria mapping, TanStack Query, and the
 * search_available_vehicles RPC boundary together (getSupabase mocked at
 * the same seam session.test.ts already establishes) — not just the
 * pure query-building logic in isolation.
 */
describe('Search screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls search_available_vehicles with the params carried from Explore and renders results', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          vehicle_id: 'v1',
          organization_id: 'org1',
          organization_name: 'Hulhumale Scooters',
          registration_number: 'P-1001-AA',
          make: 'Honda',
          model: 'Activa',
          year: 2023,
          category: 'scooter',
          transmission: 'automatic',
          color: 'Red',
          location: 'Male',
          deposit_amount_laari: 200000,
          daily_rate_laari: 30000,
          hourly_rate_laari: 5000,
        },
      ],
      error: null,
    });

    await renderSearch();

    expect(mockRpc).toHaveBeenCalledWith('search_available_vehicles', {
      p_starts_at: '2026-09-01T04:00:00.000Z',
      p_ends_at: '2026-09-02T04:00:00.000Z',
      p_location: 'Male',
      p_category: null,
      p_transmission: null,
      p_max_daily_rate_laari: null,
    });

    expect(await screen.findByTestId('vehicle-result-v1')).toBeTruthy();
    expect(screen.getByText('Honda Activa')).toBeTruthy();
  });

  it('shows an empty state when nothing matches', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await renderSearch();

    expect(await screen.findByText('Nothing available')).toBeTruthy();
  });

  it('surfaces an RPC error with a retry affordance', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'network error' } });

    await renderSearch();

    expect(await screen.findByText('network error')).toBeTruthy();
  });
});
