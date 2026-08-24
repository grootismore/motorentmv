import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../../../src/design-system/ThemeProvider';
import { CurrentOrganizationProvider } from '../../../../src/features/organizations/CurrentOrganizationContext';
import type { Membership } from '../../../../src/features/organizations/queries';
import RecordIncome from '../../../../app/(renter)/finance/record-income';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

const mockGetSession = jest.fn().mockResolvedValue({ data: { session: { user: { id: 'owner-1' } } } });
const mockFrom = jest.fn();
jest.mock('../../../../src/lib/supabase', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getSession: mockGetSession },
  }),
}));

let recordedInsertPayload: unknown;

function bookingsChain() {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  return chain;
}

function transactionsChain() {
  const builder: {
    insert: (payload: unknown) => typeof builder;
    select: () => typeof builder;
    single: () => Promise<{ data: unknown; error: null }>;
    _insertResult: unknown;
  } = {
    insert: (payload: unknown) => {
      recordedInsertPayload = payload;
      builder._insertResult = { id: 'txn-new', ...(payload as object) };
      return builder;
    },
    select: () => builder,
    single: () => Promise.resolve({ data: builder._insertResult, error: null }),
    _insertResult: undefined,
  };
  return builder;
}

const MEMBERSHIP: Membership = {
  id: 'member-1',
  organization_id: 'org-1',
  user_id: 'owner-1',
  role: 'owner',
  status: 'active',
  invited_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  organizations: {
    id: 'org-1',
    created_by: 'owner-1',
    name: 'Test Rentals',
    slug: 'test-rentals',
    status: 'active',
    currency: 'MVR',
    timezone: 'Indian/Maldives',
    default_location: 'Hulhumale',
    business_hours: {},
    policies: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
  recordedInsertPayload = undefined;
});

function renderScreen() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'bookings') return bookingsChain();
    if (table === 'transactions') return transactionsChain();
    throw new Error(`unexpected table: ${table}`);
  });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <CurrentOrganizationProvider membership={MEMBERSHIP}>
          <RecordIncome />
        </CurrentOrganizationProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('RecordIncome', () => {
  it('defaults to "No specific booking" and shows a category picker', async () => {
    await renderScreen();

    expect(await screen.findByTestId('income-category-Rental payment')).toBeTruthy();
  });

  it('records standalone income with no booking_id and the chosen category', async () => {
    await renderScreen();
    await screen.findByTestId('income-category-Rental payment');

    await fireEvent.changeText(screen.getByTestId('income-amount'), '250');
    await fireEvent.press(screen.getByTestId('income-submit'));

    await waitFor(() =>
      expect(recordedInsertPayload).toEqual(
        expect.objectContaining({
          booking_id: null,
          type: 'payment',
          amount_laari: 25000,
          category: 'Rental payment',
          recorded_by: 'owner-1',
        }),
      ),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('rejects a zero amount client-side before ever calling the server', async () => {
    await renderScreen();
    await screen.findByTestId('income-category-Rental payment');

    await fireEvent.press(screen.getByTestId('income-submit'));

    expect(await screen.findByTestId('income-form-error')).toHaveTextContent(
      'Enter an amount greater than zero.',
    );
    expect(recordedInsertPayload).toBeUndefined();
  });
});
