import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../../src/design-system/ThemeProvider';
import Checkout from '../../../app/(customer)/checkout/[vehicleId]';
import type { MyDocument } from '../../../src/features/documents/queries';

const mockRpc = jest.fn();
const mockProfileSingle = jest.fn();
jest.mock('../../../src/lib/supabase', () => ({
  getSupabase: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: () => mockProfileSingle() }) }) };
      }
      throw new Error(`unexpected table in test: ${table}`);
    },
  }),
}));

// DocumentsSection's own upload/delete flow is covered in its own test
// file (src/features/documents/DocumentsSection.test.tsx) — here it's
// just embedded read-only for the document-gate assertions below, same
// mocking approach that file uses.
const mockUploadMutate = jest.fn();
const mockDeleteMutate = jest.fn();
let mockDocuments: MyDocument[] = [];
let mockDocumentsLoading = false;
jest.mock('../../../src/features/documents/DocumentsSection', () => ({
  DocumentsSection: () => null,
}));
jest.mock('../../../src/features/documents/queries', () => {
  const actual = jest.requireActual('../../../src/features/documents/queries');
  return {
    ...actual,
    useMyDocuments: () => ({
      data: mockDocuments,
      isLoading: mockDocumentsLoading,
      isError: false,
      error: null,
      refetch: jest.fn(),
    }),
    useUploadMyDocument: () => ({ mutate: mockUploadMutate, isPending: false }),
    useDeleteMyDocument: () => ({ mutate: mockDeleteMutate, isPending: false }),
  };
});

function documentOf(documentType: 'license' | 'id_card'): MyDocument {
  return {
    id: `${documentType}-1`,
    organization_id: null,
    vehicle_id: null,
    booking_id: null,
    profile_id: 'customer-1',
    expense_id: null,
    document_type: documentType,
    storage_path: `customer-1/${documentType}.jpg`,
    status: 'pending',
    expires_at: null,
    uploaded_by: 'customer-1',
    verified_by: null,
    verified_at: null,
    created_at: '2026-08-01T00:00:00Z',
    signedUrl: null,
  };
}

const mockUseAuth = jest.fn();
jest.mock('../../../src/features/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    vehicleId: 'v1',
    startsAt: '2026-09-01T04:00:00.000Z',
    endsAt: '2026-09-02T04:00:00.000Z',
  }),
  useRouter: () => ({ replace: mockReplace }),
}));

const LISTING_ROW = {
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
  included_accessories: ['helmet'],
  deposit_amount_laari: 200000,
  daily_rate_laari: 30000,
  hourly_rate_laari: 5000,
};

const QUOTE = {
  rate_type: 'daily',
  rate_amount_laari: 30000,
  units: 1,
  subtotal_laari: 30000,
  discount_laari: 0,
  delivery_fee_laari: 0,
  deposit_amount_laari: 200000,
  total_laari: 30000,
  computed_at: '2026-08-01T00:00:00Z',
};

function mockDiscoveryRpcs() {
  mockRpc.mockImplementation((fn: string) => {
    if (fn === 'get_vehicle_listing') return Promise.resolve({ data: [LISTING_ROW], error: null });
    if (fn === 'get_listing_quote') return Promise.resolve({ data: QUOTE, error: null });
    if (fn === 'is_vehicle_bookable') return Promise.resolve({ data: true, error: null });
    return Promise.reject(new Error(`unexpected rpc in test: ${fn}`));
  });
}

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
  mockDocuments = [];
  mockDocumentsLoading = false;
});

function renderCheckout() {
  // gcTime: 0 on both queries and mutations — otherwise a successful
  // fetch/mutation schedules a real 5-minute garbage-collection timer
  // that outlives the test and hangs Jest's exit (confirmed: only tests
  // that complete the mutation were affected, never the query-only one).
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <Checkout />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/**
 * Integration coverage for the "authentication gate" and "request
 * submission" steps of the customer flow (PRD Prompt 5): the screen,
 * useAuth, TanStack Query and the get_vehicle_listing/get_listing_quote/
 * is_vehicle_bookable/request_booking RPC boundary together.
 */
describe('Checkout screen', () => {
  // Passes locally in ~300ms (well inside Jest's 5000ms default), but
  // timed out at exactly 5000ms in CI (see the "Build unsigned iOS
  // device IPA" run for commit 1ac6487) with no other test in this file
  // or suite affected -- a real render-time bug would fail consistently,
  // not only under CI's own runner load. Explicit headroom here, same
  // pattern this file's own retry test and
  // __tests__/app/(renter)/bookings/[bookingId].test.tsx already use for
  // their slower-rendering cases (via findBy*'s own `timeout` option) --
  // this one needs it on the outer test timeout instead, since the hang
  // (if the runner is this slow) can occur before findByTestId's own
  // polling window even starts.
  it('shows the inline auth gate instead of the form when signed out', async () => {
    mockDiscoveryRpcs();
    mockUseAuth.mockReturnValue({ session: null, isConfigured: true });

    await renderCheckout();

    expect(await screen.findByTestId('inline-auth-gate')).toBeTruthy();
    expect(screen.queryByTestId('rider-details-form')).toBeNull();
    expect(screen.queryByTestId('checkout-submit')).toBeNull();
    // The quote/bookable queries also fire regardless of session — wait
    // for them too so no fetch is still in flight when this test ends
    // and the QueryClient is torn down.
    await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(3));
  }, 10000);

  it('submits a booking request with the signed-in customer and navigates to the new booking', async () => {
    mockProfileSingle.mockResolvedValue({
      data: { id: 'customer-1', full_name: 'Mariyam Customer', phone: '7771234' },
      error: null,
    });
    mockDocuments = [documentOf('license'), documentOf('id_card')];
    mockUseAuth.mockReturnValue({ session: { user: { id: 'customer-1' } }, isConfigured: true });
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'get_vehicle_listing') return Promise.resolve({ data: [LISTING_ROW], error: null });
      if (fn === 'get_listing_quote') return Promise.resolve({ data: QUOTE, error: null });
      if (fn === 'is_vehicle_bookable') return Promise.resolve({ data: true, error: null });
      if (fn === 'request_booking')
        return Promise.resolve({ data: { id: 'booking-1', customer_id: 'customer-1' }, error: null });
      return Promise.reject(new Error(`unexpected rpc in test: ${fn}`));
    });

    await renderCheckout();

    // Rider details pre-fill from the customer's own profile.
    expect(await screen.findByDisplayValue('Mariyam Customer')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('checkout-submit'));

    expect(mockRpc).toHaveBeenCalledWith('request_booking', {
      p_organization_id: 'org1',
      p_vehicle_id: 'v1',
      p_customer_id: 'customer-1',
      p_starts_at: '2026-09-01T04:00:00.000Z',
      p_ends_at: '2026-09-02T04:00:00.000Z',
      p_notes: null,
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/bookings/[bookingId]',
      params: { bookingId: 'booking-1' },
    });
    expect(screen.queryByTestId('checkout-error')).toBeNull();
  });

  it('lets the customer retry after a failed submission with the exact same, idempotent params', async () => {
    mockProfileSingle.mockResolvedValue({
      data: { id: 'customer-1', full_name: 'Mariyam Customer', phone: null },
      error: null,
    });
    mockDocuments = [documentOf('license'), documentOf('id_card')];
    mockUseAuth.mockReturnValue({ session: { user: { id: 'customer-1' } }, isConfigured: true });
    let requestAttempts = 0;
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'get_vehicle_listing') return Promise.resolve({ data: [LISTING_ROW], error: null });
      if (fn === 'get_listing_quote') return Promise.resolve({ data: QUOTE, error: null });
      if (fn === 'is_vehicle_bookable') return Promise.resolve({ data: true, error: null });
      if (fn === 'request_booking') {
        requestAttempts += 1;
        // useSubmitBookingRequest sets retry: 1, so the *first* button
        // tap alone triggers two attempts (the tap, then one automatic
        // retry) before settling into an error — both must fail here
        // to reach a user-visible error state; the third attempt is
        // the customer's own manual "Try again" tap.
        if (requestAttempts <= 2) return Promise.resolve({ data: null, error: { message: 'network error' } });
        return Promise.resolve({ data: { id: 'booking-1', customer_id: 'customer-1' }, error: null });
      }
      return Promise.reject(new Error(`unexpected rpc in test: ${fn}`));
    });

    await renderCheckout();
    await screen.findByDisplayValue('Mariyam Customer');

    await fireEvent.press(screen.getByTestId('checkout-submit'));
    expect(await screen.findByTestId('checkout-error', {}, { timeout: 4000 })).toHaveTextContent(
      'network error',
    );
    expect(await screen.findByText('Try again')).toBeTruthy();
    expect(mockRpc.mock.calls.filter((call) => call[0] === 'request_booking')).toHaveLength(2);

    await fireEvent.press(screen.getByTestId('checkout-submit'));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/bookings/[bookingId]',
        params: { bookingId: 'booking-1' },
      }),
    );

    // Every attempt — the tap, the automatic retry, and the manual
    // retry — carried identical params (the idempotency key), the
    // exact property that makes any of them safe to replay.
    const requestBookingCalls = mockRpc.mock.calls.filter((call) => call[0] === 'request_booking');
    expect(requestBookingCalls).toHaveLength(3);
    expect(requestBookingCalls[0][1]).toEqual(requestBookingCalls[1][1]);
    expect(requestBookingCalls[1][1]).toEqual(requestBookingCalls[2][1]);
  }, 8000);

  it('blocks submission with a clear message when no documents are on file', async () => {
    mockProfileSingle.mockResolvedValue({
      data: { id: 'customer-1', full_name: 'Mariyam Customer', phone: null },
      error: null,
    });
    mockDocuments = [];
    mockUseAuth.mockReturnValue({ session: { user: { id: 'customer-1' } }, isConfigured: true });
    mockDiscoveryRpcs();

    await renderCheckout();
    await screen.findByDisplayValue('Mariyam Customer');

    await fireEvent.press(screen.getByTestId('checkout-submit'));

    expect(await screen.findByTestId('checkout-error')).toHaveTextContent(
      'Upload a photo of your driver’s license and ID/passport above before submitting.',
    );
    expect(mockRpc).not.toHaveBeenCalledWith('request_booking', expect.anything());
  });

  it('blocks submission when only one of the two required documents is on file', async () => {
    mockProfileSingle.mockResolvedValue({
      data: { id: 'customer-1', full_name: 'Mariyam Customer', phone: null },
      error: null,
    });
    mockDocuments = [documentOf('license')];
    mockUseAuth.mockReturnValue({ session: { user: { id: 'customer-1' } }, isConfigured: true });
    mockDiscoveryRpcs();

    await renderCheckout();
    await screen.findByDisplayValue('Mariyam Customer');

    await fireEvent.press(screen.getByTestId('checkout-submit'));

    expect(await screen.findByTestId('checkout-error')).toHaveTextContent(
      'Upload a photo of your driver’s license and ID/passport above before submitting.',
    );
    expect(mockRpc).not.toHaveBeenCalledWith('request_booking', expect.anything());
  });
});
