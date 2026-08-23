import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { BookingListItem } from './BookingListItem';
import type { BookingWithDetails } from './queries';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

function booking(overrides: Partial<BookingWithDetails> = {}): BookingWithDetails {
  return {
    id: 'booking-1',
    organization_id: 'org-1',
    vehicle_id: 'vehicle-1',
    customer_id: 'customer-1',
    status: 'accepted',
    starts_at: '2026-08-01T04:00:00Z',
    ends_at: '2026-08-02T04:00:00Z',
    quote_snapshot: null,
    policy_snapshot: null,
    currency: 'MVR',
    total_amount_laari: 150000,
    payment_status: 'unpaid',
    notes: null,
    created_at: '2026-07-30T00:00:00Z',
    updated_at: '2026-07-30T00:00:00Z',
    vehicle: { id: 'vehicle-1', registration_number: 'DEMO-001', make: 'Honda', model: 'PCX 160' },
    customer: { full_name: 'Test Customer', phone: null, email: null },
    ...overrides,
  };
}

async function renderItem(props: Parameters<typeof BookingListItem>[0]) {
  return render(
    <ThemeProvider>
      <BookingListItem {...props} />
    </ThemeProvider>,
  );
}

describe('BookingListItem', () => {
  it('renders as a navigable link by default', async () => {
    await renderItem({ booking: booking() });
    const item = screen.getByTestId('booking-item-booking-1');
    expect(item.props.accessibilityRole).toBe('button');
  });

  it('renders as non-interactive content when demo is true', async () => {
    await renderItem({ booking: booking(), demo: true });
    const item = screen.getByTestId('booking-item-booking-1');
    // The demo variant is a plain View: no accessibilityRole="button", no
    // press affordance -- there is no real row behind a demo booking id to
    // navigate to.
    expect(item.props.accessibilityRole).toBeUndefined();
    expect(item.props.onPress).toBeUndefined();
  });

  it('shows the vehicle, customer and total for both variants', async () => {
    await renderItem({ booking: booking() });
    expect(screen.getByText('Honda PCX 160 (DEMO-001)')).toBeTruthy();
    expect(screen.getByText('Test Customer')).toBeTruthy();
    expect(screen.getByText('MVR 1,500.00')).toBeTruthy();
  });
});
