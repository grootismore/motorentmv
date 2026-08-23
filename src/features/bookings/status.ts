import { isPast } from '../../lib/datetime';
import type { Booking, BookingStatus } from './queries';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'overdue';

// Labels here follow Prompt 9's vocabulary (draft, requested, confirmed,
// rejected, cancelled, ready_for_pickup, active, overdue, completed,
// no_show) even though the underlying enum keeps its original PRD names
// (accepted, declined, ready, ...) -- see the booking_no_show migration's
// doc comment for why the schema itself isn't being renamed. `needs_info`
// has no Prompt 9 equivalent and keeps its existing label unchanged.
export const STATUS_LABEL: Record<BookingStatus, string> = {
  draft: 'Draft',
  requested: 'Requested',
  accepted: 'Confirmed',
  declined: 'Rejected',
  needs_info: 'Needs info',
  ready: 'Ready for pickup',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
  no_show: 'No-show',
};

const STATUS_TONE: Record<BookingStatus, StatusTone> = {
  draft: 'neutral',
  requested: 'info',
  accepted: 'info',
  declined: 'danger',
  needs_info: 'warning',
  ready: 'info',
  active: 'success',
  completed: 'neutral',
  cancelled: 'neutral',
  overdue: 'overdue',
  no_show: 'danger',
};

/**
 * `overdue` exists as a booking_status value, but nothing in this prompt
 * writes it (no scheduled job is available in this sandbox to flip it
 * automatically — see supabase/local-dev/README.md). Instead, an active
 * booking whose return time has passed is treated as overdue for display
 * purposes only, computed here from starts_at/ends_at each time it's
 * shown — the stored status stays 'active' until an org member completes
 * or cancels it.
 */
export function displayBookingStatus(booking: Pick<Booking, 'status' | 'ends_at'>): {
  label: string;
  tone: StatusTone;
} {
  if (booking.status === 'active' && isPast(booking.ends_at)) {
    return { label: STATUS_LABEL.overdue, tone: STATUS_TONE.overdue };
  }
  return { label: STATUS_LABEL[booking.status], tone: STATUS_TONE[booking.status] };
}
