import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { InspectionSummary } from './InspectionSummary';
import type { Inspection } from './queries';

const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

function documentsChain() {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  return chain;
}

function inspection(overrides: Partial<Inspection>): Inspection {
  return {
    id: 'insp-1',
    booking_id: 'booking-1',
    inspection_type: 'pickup',
    odometer_km: 1200,
    fuel_battery_percent: 80,
    condition_notes: null,
    accessories_checklist: {},
    performed_by: 'staff-1',
    acknowledged_by: null,
    acknowledged_at: null,
    created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
});

function renderSummary(props: Parameters<typeof InspectionSummary>[0]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'documents') return documentsChain();
    throw new Error(`unexpected table: ${table}`);
  });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <InspectionSummary {...props} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('InspectionSummary', () => {
  it('shows the odometer and fuel/battery reading', async () => {
    await renderSummary({ inspection: inspection({}), bookingId: 'booking-1', canAcknowledge: false });

    expect(await screen.findByText('1200 km · 80% fuel/battery')).toBeTruthy();
  });

  it('lets the customer acknowledge an unacknowledged record', async () => {
    mockRpc.mockResolvedValue({
      data: { ...inspection({}), acknowledged_by: 'cust-1', acknowledged_at: '2026-08-02T00:00:00Z' },
      error: null,
    });

    await renderSummary({ inspection: inspection({}), bookingId: 'booking-1', canAcknowledge: true });

    await fireEvent.press(await screen.findByTestId('inspection-acknowledge-pickup'));

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('acknowledge_inspection', { p_inspection_id: 'insp-1' }),
    );
  });

  it('shows distance travelled and fuel/battery change against the pickup reading on a return summary', async () => {
    const pickup = inspection({ odometer_km: 1000, fuel_battery_percent: 90 });
    const returnInsp = inspection({
      id: 'insp-2',
      inspection_type: 'return',
      odometer_km: 1150,
      fuel_battery_percent: 60,
    });

    await renderSummary({
      inspection: returnInsp,
      bookingId: 'booking-1',
      canAcknowledge: false,
      pickupInspection: pickup,
    });

    expect(await screen.findByTestId('inspection-comparison-return')).toHaveTextContent(
      '150 km travelled · -30% fuel/battery vs pickup',
    );
  });

  it('omits the comparison line on a pickup summary (no prior inspection to compare against)', async () => {
    await renderSummary({ inspection: inspection({}), bookingId: 'booking-1', canAcknowledge: false });

    await screen.findByText('1200 km · 80% fuel/battery');
    expect(screen.queryByTestId('inspection-comparison-return')).toBeNull();
  });
});
