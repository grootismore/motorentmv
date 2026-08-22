import { displayBookingStatus } from './status';

describe('displayBookingStatus', () => {
  it('labels a plain status as-is', () => {
    expect(displayBookingStatus({ status: 'requested', ends_at: '2099-01-01T00:00:00Z' })).toEqual({
      label: 'Requested',
      tone: 'info',
    });
  });

  it('shows an active booking whose return time has passed as overdue', () => {
    expect(displayBookingStatus({ status: 'active', ends_at: '2000-01-01T00:00:00Z' })).toEqual({
      label: 'Overdue',
      // Ocean Glass gives overdue its own distinct tone/color (separate
      // from other 'danger' states like a declined booking) so staff can
      // tell them apart at a glance, matching the reference's distinct
      // overdue-red KPI tile.
      tone: 'overdue',
    });
  });

  it('does not treat a future-ending active booking as overdue', () => {
    expect(displayBookingStatus({ status: 'active', ends_at: '2099-01-01T00:00:00Z' })).toEqual({
      label: 'Active',
      tone: 'success',
    });
  });

  it('does not treat a non-active booking with a past end date as overdue', () => {
    expect(displayBookingStatus({ status: 'completed', ends_at: '2000-01-01T00:00:00Z' })).toEqual({
      label: 'Completed',
      tone: 'neutral',
    });
  });
});
