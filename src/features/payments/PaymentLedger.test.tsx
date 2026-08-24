import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { PaymentLedger } from './PaymentLedger';

const mockGetSession = jest.fn().mockResolvedValue({ data: { session: { user: { id: 'renter-1' } } } });
const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getSession: mockGetSession },
  }),
}));

let recordedInsertPayload: unknown;

/** A single mock query-builder flexible enough for both flows this table
 * needs: a plain select-list awaited directly (`.select().eq().order()`),
 * and an insert-then-read-back (`.insert(payload).select().single()`). */
function tableMock(listData: unknown) {
  const builder: {
    select: () => typeof builder;
    eq: () => typeof builder;
    order: () => typeof builder;
    insert: (payload: unknown) => typeof builder;
    single: () => Promise<{ data: unknown; error: null }>;
    then: (resolve: (v: { data: unknown; error: null }) => void) => void;
    _insertResult: unknown;
  } = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    insert: (payload: unknown) => {
      recordedInsertPayload = payload;
      builder._insertResult = { ...(payload as object), id: 'txn-new' };
      return builder;
    },
    single: () => Promise.resolve({ data: builder._insertResult ?? listData, error: null }),
    then: (resolve) => resolve({ data: listData, error: null }),
    _insertResult: undefined,
  };
  return builder;
}

const BOOKING = {
  id: 'booking-1',
  organization_id: 'org-1',
  vehicle_id: 'v1',
  customer_id: 'cust-1',
  status: 'accepted',
  total_amount_laari: 100000,
};

const TRANSACTIONS = [
  {
    id: 'txn-1',
    booking_id: 'booking-1',
    organization_id: 'org-1',
    type: 'payment',
    method: 'cash',
    amount_laari: 60000,
    reference: null,
    note: null,
    recorded_by: 'renter-1',
    occurred_at: '2026-08-01T00:00:00Z',
    created_at: '2026-08-01T00:00:00Z',
  },
];

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
  recordedInsertPayload = undefined;
});

function renderLedger(props: Parameters<typeof PaymentLedger>[0]) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <PaymentLedger {...props} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

function mockTables(booking: unknown = BOOKING, transactions: unknown = TRANSACTIONS) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'transactions') return tableMock(transactions);
    if (table === 'bookings') return tableMock(booking);
    throw new Error(`unexpected table: ${table}`);
  });
}

describe('PaymentLedger', () => {
  it('shows the paid amount and remaining balance due for a partial payment', async () => {
    mockTables();

    await renderLedger({ bookingId: 'booking-1', organizationId: 'org-1', viewerRole: 'renter' });

    expect(await screen.findByText('Paid: MVR 600.00')).toBeTruthy();
    expect(screen.getByText('Balance due: MVR 400.00')).toBeTruthy();
  });

  it('hides the recording form from a customer, showing the same ledger read-only', async () => {
    mockTables();

    await renderLedger({ bookingId: 'booking-1', organizationId: 'org-1', viewerRole: 'customer' });

    expect(await screen.findByTestId('payment-ledger-list')).toBeTruthy();
    expect(screen.queryByTestId('payment-ledger-form')).toBeNull();
  });

  it('lets a renter record a bank-transfer payment with no card fields anywhere', async () => {
    mockTables();

    await renderLedger({ bookingId: 'booking-1', organizationId: 'org-1', viewerRole: 'renter' });
    await screen.findByTestId('payment-ledger-form');

    expect(screen.getByTestId('payment-no-card-notice')).toBeTruthy();

    fireEvent.press(screen.getByTestId('payment-method-bank_transfer'));
    await waitFor(() =>
      expect(screen.getByTestId('payment-method-bank_transfer').props.accessibilityState.selected).toBe(true),
    );

    fireEvent.changeText(screen.getByTestId('payment-amount'), '400.00');
    await waitFor(() => expect(screen.getByTestId('payment-amount').props.value).toBe('400.00'));

    fireEvent.press(screen.getByTestId('payment-submit'));

    await waitFor(() =>
      expect(recordedInsertPayload).toEqual(
        expect.objectContaining({
          booking_id: 'booking-1',
          organization_id: 'org-1',
          type: 'payment',
          method: 'bank_transfer',
          amount_laari: 40000,
          recorded_by: 'renter-1',
        }),
      ),
    );
  });

  it('rejects a zero or empty amount client-side before ever calling the server', async () => {
    mockTables();

    await renderLedger({ bookingId: 'booking-1', organizationId: 'org-1', viewerRole: 'renter' });
    await screen.findByTestId('payment-ledger-form');

    fireEvent.press(screen.getByTestId('payment-submit'));

    expect(await screen.findByTestId('payment-ledger-error')).toHaveTextContent(
      'Enter an amount greater than zero.',
    );
    expect(recordedInsertPayload).toBeUndefined();
  });

  it('shows the deposit as not yet paid when net payments fall short of the frozen deposit amount', async () => {
    mockTables({ ...BOOKING, quote_snapshot: { deposit_amount_laari: 200000 } });

    await renderLedger({ bookingId: 'booking-1', organizationId: 'org-1', viewerRole: 'renter' });

    expect(await screen.findByTestId('payment-ledger-deposit-status')).toHaveTextContent(
      'Deposit (MVR 2,000.00): Not yet paid — required before handover',
    );
  });

  it('shows the deposit as paid once net payments reach the frozen deposit amount', async () => {
    mockTables({ ...BOOKING, quote_snapshot: { deposit_amount_laari: 60000 } }, TRANSACTIONS);

    await renderLedger({ bookingId: 'booking-1', organizationId: 'org-1', viewerRole: 'renter' });

    expect(await screen.findByTestId('payment-ledger-deposit-status')).toHaveTextContent(
      'Deposit (MVR 600.00): Paid',
    );
  });

  it('hides the deposit line entirely when the vehicle carries no deposit', async () => {
    mockTables({ ...BOOKING, quote_snapshot: { deposit_amount_laari: 0 } });

    await renderLedger({ bookingId: 'booking-1', organizationId: 'org-1', viewerRole: 'renter' });

    await screen.findByText('Paid: MVR 600.00');
    expect(screen.queryByTestId('payment-ledger-deposit-status')).toBeNull();
  });
});
