import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { InspectionForm } from './InspectionForm';

const mockGetSession = jest.fn().mockResolvedValue({ data: { session: { user: { id: 'staff-1' } } } });
const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getSession: mockGetSession },
  }),
}));

let recordedInsertPayload: unknown;

function inspectionsTableMock() {
  const builder: {
    select: () => typeof builder;
    eq: () => typeof builder;
    insert: (payload: unknown) => typeof builder;
    single: () => Promise<{ data: unknown; error: null }>;
    maybeSingle: () => Promise<{ data: null; error: null }>;
    _insertResult: unknown;
  } = {
    select: () => builder,
    eq: () => builder,
    insert: (payload: unknown) => {
      recordedInsertPayload = payload;
      builder._insertResult = { id: 'insp-new', booking_id: 'booking-1', ...(payload as object) };
      return builder;
    },
    single: () => Promise.resolve({ data: builder._insertResult, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    _insertResult: undefined,
  };
  return builder;
}

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
  recordedInsertPayload = undefined;
});

function renderForm(inspectionType: 'pickup' | 'return' = 'pickup') {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'inspections') return inspectionsTableMock();
    throw new Error(`unexpected table: ${table}`);
  });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <InspectionForm bookingId="booking-1" organizationId="org-1" inspectionType={inspectionType} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('InspectionForm', () => {
  it('rejects submission with no odometer reading, without calling the server', async () => {
    await renderForm();

    await fireEvent.press(screen.getByTestId('inspection-submit-pickup'));

    expect(await screen.findByTestId('inspection-error-pickup')).toHaveTextContent(
      'Enter the odometer reading.',
    );
    expect(recordedInsertPayload).toBeUndefined();
  });

  it('rejects a fuel/battery percentage outside 0-100', async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByTestId('inspection-odometer-pickup'), '1200');
    await fireEvent.changeText(screen.getByTestId('inspection-fuel-pickup'), '150');
    await fireEvent.press(screen.getByTestId('inspection-submit-pickup'));

    expect(await screen.findByTestId('inspection-error-pickup')).toHaveTextContent(
      'Enter a fuel/battery level between 0 and 100, or leave it blank.',
    );
    expect(recordedInsertPayload).toBeUndefined();
  });

  it('records a checklist with the odometer, fuel level and toggled accessories', async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByTestId('inspection-odometer-pickup'), '1200');
    await fireEvent.changeText(screen.getByTestId('inspection-fuel-pickup'), '80');
    await fireEvent.press(screen.getByTestId('inspection-accessory-helmet'));
    await fireEvent.press(screen.getByTestId('inspection-submit-pickup'));

    await waitFor(() =>
      expect(recordedInsertPayload).toEqual(
        expect.objectContaining({
          booking_id: 'booking-1',
          inspection_type: 'pickup',
          odometer_km: 1200,
          fuel_battery_percent: 80,
          accessories_checklist: { helmet: true },
          performed_by: 'staff-1',
        }),
      ),
    );
  });

  it('leaves fuel/battery null when the field is left blank', async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByTestId('inspection-odometer-pickup'), '1200');
    await fireEvent.press(screen.getByTestId('inspection-submit-pickup'));

    await waitFor(() =>
      expect(recordedInsertPayload).toEqual(expect.objectContaining({ fuel_battery_percent: null })),
    );
  });
});
