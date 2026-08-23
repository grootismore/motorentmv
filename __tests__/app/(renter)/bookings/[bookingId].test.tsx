import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../../../src/design-system/ThemeProvider';
import BookingDetail from '../../../../app/(renter)/bookings/[bookingId]';

const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../../../src/lib/supabase', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ bookingId: 'booking-1' }),
}));

function resultChain(data: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    single: () => Promise.resolve({ data, error: null }),
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
  return chain;
}

/**
 * useInspections lists (awaited directly) while useRecordInspection first
 * checks for an existing row via .maybeSingle() and then either .insert()s
 * or .update()s -- one mock has to serve both entry points on the same
 * 'inspections' table.
 */
function inspectionsChain(listData: unknown[]) {
  let written: Record<string, unknown> | undefined;
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    insert: (payload: Record<string, unknown>) => {
      written = payload;
      return chain;
    },
    update: (payload: Record<string, unknown>) => {
      written = payload;
      return chain;
    },
    single: () => Promise.resolve({ data: { id: 'insp-new', ...written }, error: null }),
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data: listData, error: null }),
  };
  return chain;
}

const READY_BOOKING = {
  id: 'booking-1',
  organization_id: 'org-1',
  vehicle_id: 'v1',
  customer_id: 'cust-1',
  status: 'ready',
  starts_at: '2026-09-01T04:00:00.000Z',
  ends_at: '2026-09-02T04:00:00.000Z',
  quote_snapshot: {
    rate_type: 'daily',
    rate_amount_laari: 30000,
    units: 1,
    subtotal_laari: 30000,
    discount_laari: 0,
    delivery_fee_laari: 0,
    deposit_amount_laari: 200000,
    total_laari: 30000,
    computed_at: '2026-08-01T00:00:00Z',
  },
  total_amount_laari: 30000,
  notes: null,
  vehicle: { id: 'v1', registration_number: 'P-1001-AA', make: 'Honda', model: 'Activa' },
  customer: { full_name: 'Mariyam Customer', phone: null, email: 'customer@example.com' },
};

function mockNoInspectionsYet() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'bookings') return resultChain(READY_BOOKING);
    if (table === 'inspections') return inspectionsChain([]);
    if (table === 'transactions') return resultChain([]);
    if (table === 'booking_events') return resultChain([]);
    throw new Error(`unexpected table in test: ${table}`);
  });
}

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
});

function renderScreen() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <BookingDetail />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/**
 * Integration coverage for the handover lifecycle gate (PRD Prompt 6): the
 * database rejects activate_booking without a recorded pickup inspection
 * (proven server-side in supabase/tests/07_handover_and_ledger.sql) --
 * this proves the renter UI surfaces that rejection clearly rather than
 * failing silently or with a cryptic error, and that the inspection form
 * itself is the obvious next step on the same screen.
 *
 * This screen renders more chained/nested cards (GroupedSection, ActionPanel,
 * PaymentLedger, BookingTimeline) than any other single screen, each layered
 * on top of the useBooking -> useInspections query sequence this test
 * exercises. RTL's default findBy* timeout (1000ms) was intermittently too
 * tight for that on the CI runner even though the underlying render path is
 * correct (confirmed reproducible in CI, not reproduced locally) -- the
 * explicit 5000ms below is a realistic budget for that chain, not a mask for
 * a bug.
 */
describe('Renter booking detail — handover lifecycle gate', () => {
  it('shows the pickup inspection form (not a summary) when the booking is ready and none is recorded yet', async () => {
    mockNoInspectionsYet();

    await renderScreen();

    expect(await screen.findByTestId('inspection-form-pickup', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByTestId('inspection-summary-pickup')).toBeNull();
  });

  it("surfaces the database's lifecycle-gate rejection clearly when activation is attempted first", async () => {
    mockNoInspectionsYet();
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'activate_booking') {
        return Promise.resolve({
          data: null,
          error: { message: 'booking booking-1 cannot start (active) without a recorded pickup inspection' },
        });
      }
      return Promise.reject(new Error(`unexpected rpc in test: ${fn}`));
    });

    await renderScreen();
    await screen.findByTestId('inspection-form-pickup', {}, { timeout: 5000 });

    await fireEvent.press(screen.getByTestId('booking-action-activate'));

    expect(await screen.findByTestId('booking-action-error')).toHaveTextContent(
      'booking booking-1 cannot start (active) without a recorded pickup inspection',
    );
  });

  it('lets the renter record the pickup inspection directly from this screen', async () => {
    mockNoInspectionsYet();

    await renderScreen();
    await screen.findByTestId('inspection-form-pickup', {}, { timeout: 5000 });

    await fireEvent.changeText(screen.getByTestId('inspection-odometer-pickup'), '1200');
    await fireEvent.press(screen.getByTestId('inspection-submit-pickup'));

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('inspections'));
  });
});

/**
 * Prompt 9 ("complete booking lifecycle"): no_show is only reachable from
 * a confirmed/ready booking (see the booking_no_show migration), which
 * READY_BOOKING already is -- this proves the ActionPanel wiring for the
 * new action end to end, not just the pure actionsFor()/status.ts mapping
 * already covered by ActionPanel's own inline logic and status.test.ts.
 */
describe('Renter booking detail — no-show', () => {
  it('marks a ready booking as a no-show with an optional note', async () => {
    mockNoInspectionsYet();
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'mark_booking_no_show') {
        return Promise.resolve({ data: { ...READY_BOOKING, status: 'no_show' }, error: null });
      }
      return Promise.reject(new Error(`unexpected rpc in test: ${fn}`));
    });

    await renderScreen();
    await screen.findByTestId('inspection-form-pickup', {}, { timeout: 5000 });

    await fireEvent.press(screen.getByTestId('booking-action-no_show'));
    await fireEvent.changeText(await screen.findByTestId('booking-action-note'), 'Customer never arrived');
    await fireEvent.press(screen.getByTestId('booking-action-confirm'));

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('mark_booking_no_show', {
        p_booking_id: 'booking-1',
        p_reason: 'Customer never arrived',
      }),
    );
  });
});
