import { describeActivityEvent, type ActivityBookingEvent } from './queries';

// This suite only exercises the pure describeActivityEvent() function above,
// but ./queries also exports useRecentActivity, which pulls in the real
// Supabase client (and, transitively, AsyncStorage) at import time -- mock
// it out the same way PaymentLedger.test.tsx/InspectionSection.test.tsx do.
jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({}),
}));

const BASE_BOOKING = {
  id: 'booking-1',
  organization_id: 'org-1',
  vehicle: { registration_number: 'DEMO-001', make: 'Honda', model: 'PCX 160' },
  customer: { full_name: 'Test Customer' },
};

function eventOf(overrides: Partial<ActivityBookingEvent>): ActivityBookingEvent {
  return {
    id: 'event-1',
    booking_id: 'booking-1',
    actor_id: null,
    event_type: 'created',
    from_status: null,
    to_status: null,
    metadata: {},
    created_at: '2026-08-01T00:00:00Z',
    booking: BASE_BOOKING,
    ...overrides,
  };
}

describe('describeActivityEvent', () => {
  it('describes a new booking request', () => {
    expect(describeActivityEvent(eventOf({ event_type: 'created' }))).toBe(
      'New booking request for Honda PCX 160',
    );
  });

  it('describes a status change by its to_status', () => {
    expect(describeActivityEvent(eventOf({ event_type: 'status_change', to_status: 'accepted' }))).toBe(
      'Booking confirmed for Honda PCX 160',
    );
    expect(describeActivityEvent(eventOf({ event_type: 'status_change', to_status: 'active' }))).toBe(
      'Handover completed for Honda PCX 160',
    );
    expect(describeActivityEvent(eventOf({ event_type: 'status_change', to_status: 'no_show' }))).toBe(
      'Marked as a no-show for Honda PCX 160',
    );
  });

  it('describes payment, refund and adjustment events distinctly', () => {
    expect(describeActivityEvent(eventOf({ event_type: 'payment_recorded' }))).toBe(
      'Payment recorded for Honda PCX 160',
    );
    expect(describeActivityEvent(eventOf({ event_type: 'refund_recorded' }))).toBe(
      'Refund recorded for Honda PCX 160',
    );
    expect(describeActivityEvent(eventOf({ event_type: 'adjustment_recorded' }))).toBe(
      'Adjustment recorded for Honda PCX 160',
    );
  });

  it('describes inspection events', () => {
    expect(describeActivityEvent(eventOf({ event_type: 'inspection_recorded' }))).toBe(
      'Inspection recorded for Honda PCX 160',
    );
    expect(describeActivityEvent(eventOf({ event_type: 'inspection_acknowledged' }))).toBe(
      'Customer acknowledged inspection for Honda PCX 160',
    );
  });

  it('falls back to the registration number when make/model are both missing', () => {
    const event = eventOf({
      event_type: 'created',
      booking: { ...BASE_BOOKING, vehicle: { registration_number: 'DEMO-002', make: null, model: null } },
    });
    expect(describeActivityEvent(event)).toBe('New booking request for DEMO-002');
  });
});
