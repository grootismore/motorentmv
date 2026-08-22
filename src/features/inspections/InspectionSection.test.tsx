import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { InspectionSection } from './InspectionSection';

const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

function resultChain(data: unknown, error: unknown = null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => resolve({ data, error }),
  };
  return chain;
}

const PICKUP_INSPECTION = {
  id: 'insp-1',
  booking_id: 'booking-1',
  inspection_type: 'pickup' as const,
  odometer_km: 1200,
  fuel_battery_percent: 80,
  condition_notes: 'Minor scratch',
  accessories_checklist: { helmet: true },
  performed_by: 'staff-1',
  acknowledged_by: null,
  acknowledged_at: null,
  created_at: '2026-08-01T00:00:00Z',
};

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
});

function renderSection(props: Parameters<typeof InspectionSection>[0]) {
  // mutations.gcTime: 0 too -- a successful mutation (acknowledge_inspection
  // below) otherwise schedules a real 5-minute GC timer that outlives the
  // test and hangs Jest's exit (same root cause as
  // __tests__/app/(customer)/checkout.test.tsx's identical fix).
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <InspectionSection {...props} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('InspectionSection', () => {
  it('shows the pickup recording form for a renter when no pickup inspection exists yet and the booking is ready', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'inspections') return resultChain([]);
      throw new Error(`unexpected table: ${table}`);
    });

    await renderSection({
      bookingId: 'booking-1',
      organizationId: 'org-1',
      bookingStatus: 'ready',
      viewerRole: 'renter',
    });

    expect(await screen.findByTestId('inspection-form-pickup')).toBeTruthy();
    expect(screen.queryByTestId('inspection-summary-pickup')).toBeNull();
  });

  it('shows a read-only summary for a renter once the pickup inspection is recorded, with no acknowledge button', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'inspections') return resultChain([PICKUP_INSPECTION]);
      if (table === 'documents') return resultChain([]);
      throw new Error(`unexpected table: ${table}`);
    });

    await renderSection({
      bookingId: 'booking-1',
      organizationId: 'org-1',
      bookingStatus: 'ready',
      viewerRole: 'renter',
    });

    expect(await screen.findByTestId('inspection-summary-pickup')).toBeTruthy();
    expect(screen.getByText('1200 km · 80% fuel/battery')).toBeTruthy();
    expect(screen.queryByTestId('inspection-form-pickup')).toBeNull();
    expect(screen.queryByTestId('inspection-acknowledge-pickup')).toBeNull();
    expect(screen.getByText('Not yet acknowledged')).toBeTruthy();
  });

  it('lets the customer acknowledge a recorded, unacknowledged pickup inspection', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'inspections') return resultChain([PICKUP_INSPECTION]);
      if (table === 'documents') return resultChain([]);
      throw new Error(`unexpected table: ${table}`);
    });
    mockRpc.mockResolvedValue({
      data: { ...PICKUP_INSPECTION, acknowledged_by: 'cust-1', acknowledged_at: '2026-08-02T00:00:00Z' },
      error: null,
    });

    await renderSection({
      bookingId: 'booking-1',
      organizationId: 'org-1',
      bookingStatus: 'ready',
      viewerRole: 'customer',
    });

    const acknowledgeButton = await screen.findByTestId('inspection-acknowledge-pickup');
    fireEvent.press(acknowledgeButton);

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('acknowledge_inspection', { p_inspection_id: 'insp-1' }),
    );
  });

  it('renders nothing when there is nothing recorded and no form applies (e.g. still requested)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'inspections') return resultChain([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { toJSON } = await renderSection({
      bookingId: 'booking-1',
      organizationId: 'org-1',
      bookingStatus: 'requested',
      viewerRole: 'renter',
    });

    expect(screen.queryByTestId('inspection-section')).toBeNull();
    expect(toJSON()).toBeNull();
  });
});
