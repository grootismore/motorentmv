import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { MaintenanceSection } from './MaintenanceSection';

const mockGetSession = jest.fn().mockResolvedValue({ data: { session: { user: { id: 'owner-1' } } } });
const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getSession: mockGetSession },
  }),
}));

let recordedInsertPayload: unknown;
let recordedDeleteId: unknown;

/** A single mock query-builder covering this table's three flows: a plain
 * select-list (`.select().eq().order()`), an insert-then-read-back
 * (`.insert(payload).select().single()`), and a delete (`.delete().eq()`). */
function tableMock(listData: unknown) {
  const builder: {
    select: () => typeof builder;
    eq: (column: string, value: unknown) => typeof builder;
    order: () => typeof builder;
    insert: (payload: unknown) => typeof builder;
    delete: () => typeof builder;
    single: () => Promise<{ data: unknown; error: null }>;
    then: (resolve: (v: { data: unknown; error: null }) => void) => void;
    _insertResult: unknown;
    _isDelete: boolean;
  } = {
    select: () => builder,
    eq: (_column: string, value: unknown) => {
      if (builder._isDelete) recordedDeleteId = value;
      return builder;
    },
    order: () => builder,
    insert: (payload: unknown) => {
      recordedInsertPayload = payload;
      builder._insertResult = { ...(payload as object), id: 'record-new' };
      return builder;
    },
    delete: () => {
      builder._isDelete = true;
      return builder;
    },
    single: () => Promise.resolve({ data: builder._insertResult ?? listData, error: null }),
    then: (resolve) => resolve({ data: listData, error: null }),
    _insertResult: undefined,
    _isDelete: false,
  };
  return builder;
}

const RECORDS = [
  {
    id: 'rec-1',
    organization_id: 'org-1',
    vehicle_id: 'vehicle-1',
    description: 'Oil change',
    cost_laari: 85000,
    odometer_km_at_service: 12000,
    performed_on: '2026-08-01',
    recorded_by: 'owner-1',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
];

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
  recordedInsertPayload = undefined;
  recordedDeleteId = undefined;
});

function renderSection(listData: unknown = RECORDS) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'vehicle_maintenance_records') return tableMock(listData);
    throw new Error(`unexpected table: ${table}`);
  });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MaintenanceSection vehicleId="vehicle-1" organizationId="org-1" />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('MaintenanceSection', () => {
  it('lists an existing service entry with its odometer reading and cost', async () => {
    await renderSection();

    expect(await screen.findByText('Oil change')).toBeTruthy();
    expect(screen.getByText(/12,000 km/)).toBeTruthy();
    expect(screen.getByText(/MVR 850.00/)).toBeTruthy();
  });

  it('shows an empty state when the vehicle has no service history yet', async () => {
    await renderSection([]);

    expect(await screen.findByText('No service history')).toBeTruthy();
  });

  it('records a new entry with a null cost when the cost field is left blank', async () => {
    await renderSection();
    await screen.findByText('Oil change');

    await fireEvent.press(screen.getByTestId('maintenance-add'));
    await fireEvent.changeText(await screen.findByTestId('maintenance-description'), 'Tyre replacement');
    await fireEvent.press(screen.getByTestId('maintenance-save'));

    await waitFor(() =>
      expect(recordedInsertPayload).toEqual(
        expect.objectContaining({
          organization_id: 'org-1',
          vehicle_id: 'vehicle-1',
          description: 'Tyre replacement',
          cost_laari: null,
          odometer_km_at_service: null,
          recorded_by: 'owner-1',
        }),
      ),
    );
  });

  it('rejects an empty description client-side before ever calling the server', async () => {
    await renderSection();
    await screen.findByText('Oil change');

    await fireEvent.press(screen.getByTestId('maintenance-add'));
    await fireEvent.press(await screen.findByTestId('maintenance-save'));

    expect(await screen.findByTestId('maintenance-error')).toHaveTextContent(
      'Describe what was done (e.g. oil change).',
    );
    expect(recordedInsertPayload).toBeUndefined();
  });

  it('deletes an entry once the native confirmation is accepted', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const removeButton = (buttons as { text: string; onPress?: () => void }[]).find(
        (b) => b.text === 'Remove',
      );
      removeButton?.onPress?.();
    });

    await renderSection();
    await screen.findByText('Oil change');

    await fireEvent.press(screen.getByTestId('maintenance-record-rec-1-delete'));

    await waitFor(() => expect(recordedDeleteId).toBe('rec-1'));
    alertSpy.mockRestore();
  });
});
