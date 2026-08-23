import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import type { ActivityBookingEvent } from '../activity/queries';
import { RecentActivityCard } from './RecentActivityCard';

// This screen only needs the pure describeActivityEvent() function from
// ../activity/queries, but that module also exports useRecentActivity,
// which pulls in the real Supabase client (and, transitively,
// AsyncStorage) at import time -- mock it out the same way
// PaymentLedger.test.tsx/InspectionSection.test.tsx do.
jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({}),
}));

function event(overrides: Partial<ActivityBookingEvent> = {}): ActivityBookingEvent {
  return {
    id: 'event-1',
    booking_id: 'booking-1',
    actor_id: null,
    event_type: 'created',
    from_status: null,
    to_status: null,
    metadata: {},
    created_at: '2026-08-01T00:00:00Z',
    booking: {
      id: 'booking-1',
      organization_id: 'org-1',
      vehicle: { registration_number: 'DEMO-001', make: 'Honda', model: 'PCX 160' },
      customer: { full_name: 'Test Customer' },
    },
    ...overrides,
  };
}

describe('RecentActivityCard', () => {
  it('shows the empty-state message when there is no activity yet', async () => {
    await render(
      <ThemeProvider>
        <RecentActivityCard events={[]} />
      </ThemeProvider>,
    );

    expect(
      screen.getByText('Nothing has happened yet — new requests, payments and handovers will appear here.'),
    ).toBeTruthy();
  });

  it('lists each event with its description and timestamp', async () => {
    await render(
      <ThemeProvider>
        <RecentActivityCard events={[event()]} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('activity-item-event-1')).toHaveTextContent(
      'New booking request for Honda PCX 160',
      { exact: false },
    );
  });
});
