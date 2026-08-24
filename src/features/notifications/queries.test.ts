import { notificationBookingId, notificationNote, type NotificationRow } from './queries';

// Same reasoning as activity/queries.test.ts: only the pure helpers below
// are exercised here, but this module also exports hooks that pull in the
// real Supabase client at import time.
jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({}),
}));

function notificationOf(overrides: Partial<NotificationRow>): NotificationRow {
  return {
    id: 'notif-1',
    recipient_id: 'user-1',
    type: 'booking_needs_info',
    payload: {},
    read_at: null,
    delivery_status: 'pending',
    delivered_at: null,
    created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

describe('notificationBookingId', () => {
  it('reads the booking_id every fan-out branch includes', () => {
    expect(notificationBookingId(notificationOf({ payload: { booking_id: 'b-1' } }))).toBe('b-1');
  });

  it('returns null when the payload has no booking_id', () => {
    expect(notificationBookingId(notificationOf({ payload: {} }))).toBeNull();
  });
});

describe('notificationNote', () => {
  it('surfaces the renter-attached note for needs_info/decline/cancel/no_show', () => {
    expect(
      notificationNote(
        notificationOf({ payload: { booking_id: 'b-1', note: 'Please upload a clearer ID photo' } }),
      ),
    ).toBe('Please upload a clearer ID photo');
  });

  it('returns null when there is no note', () => {
    expect(notificationNote(notificationOf({ payload: { booking_id: 'b-1' } }))).toBeNull();
  });

  it('returns null for an empty-string note rather than showing a blank line', () => {
    expect(notificationNote(notificationOf({ payload: { note: '' } }))).toBeNull();
  });
});
