import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../../../src/design-system/ThemeProvider';
import { CurrentOrganizationProvider } from '../../../../src/features/organizations/CurrentOrganizationContext';
import type { Membership } from '../../../../src/features/organizations/queries';
import FinanceReports from '../../../../app/(renter)/finance/reports';

const mockDelete = jest.fn();
const mockCreate = jest.fn();
const mockWrite = jest.fn();
const mockFileInstances: { exists: boolean; uri: string }[] = [];

jest.mock('expo-file-system', () => {
  class MockFile {
    exists = false;
    uri = 'file:///cache/finance-report.csv';
    constructor(...args: unknown[]) {
      void args;
      mockFileInstances.push(this);
    }
    delete = mockDelete;
    create = mockCreate;
    write = mockWrite;
  }
  return { File: MockFile, Paths: { cache: 'file:///cache' } };
});

const mockIsAvailableAsync = jest.fn().mockResolvedValue(true);
const mockShareAsync = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

function chainFor(data: unknown[]) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    lt: () => chain,
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data, error: null }),
  };
  return chain;
}

const mockFrom = jest.fn();
jest.mock('../../../../src/lib/supabase', () => ({
  getSupabase: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

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

const TRANSACTIONS = [
  {
    id: 'txn-1',
    organization_id: 'org-1',
    booking_id: 'b-1',
    type: 'payment',
    method: 'cash',
    amount_laari: 10000,
    reference: null,
    note: null,
    recorded_by: 'owner-1',
    occurred_at: '2026-08-05T10:00:00Z',
    created_at: '2026-08-05T10:00:00Z',
    category: null,
  },
];
const EXPENSES = [
  {
    id: 'exp-1',
    organization_id: 'org-1',
    vehicle_id: null,
    category: 'Fuel',
    amount_laari: 2000,
    occurred_on: '2026-08-03',
    note: null,
    recorded_by: 'owner-1',
    created_at: '2026-08-03T10:00:00Z',
    updated_at: '2026-08-03T10:00:00Z',
  },
];

let client: QueryClient;
afterEach(() => {
  client.unmount();
  jest.clearAllMocks();
  mockFileInstances.length = 0;
});

function renderScreen() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'transactions') return chainFor(TRANSACTIONS);
    if (table === 'expenses') return chainFor(EXPENSES);
    throw new Error(`unexpected table: ${table}`);
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <CurrentOrganizationProvider membership={MEMBERSHIP}>
          <FinanceReports />
        </CurrentOrganizationProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('FinanceReports export', () => {
  it('enables the export button once the month data has loaded', async () => {
    await renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId('reports-export-csv').props.accessibilityState.disabled).toBe(false),
    );
  });

  it('writes a CSV to the cache directory and hands it to the native share sheet', async () => {
    await renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId('reports-export-csv').props.accessibilityState.disabled).toBe(false),
    );

    await fireEvent.press(screen.getByTestId('reports-export-csv'));

    await waitFor(() => expect(mockShareAsync).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('Date,Type,Category'));
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///cache/finance-report.csv',
      expect.objectContaining({ mimeType: 'text/csv' }),
    );
  });

  it('shows an alert instead of sharing when the share sheet is unavailable', async () => {
    const { Alert } = jest.requireActual('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockIsAvailableAsync.mockResolvedValueOnce(false);

    await renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId('reports-export-csv').props.accessibilityState.disabled).toBe(false),
    );
    await fireEvent.press(screen.getByTestId('reports-export-csv'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Sharing unavailable', expect.any(String)));
    expect(mockShareAsync).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
