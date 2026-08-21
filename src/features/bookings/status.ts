import { isPast } from '../../lib/datetime';
import type { Booking, BookingStatus } from './queries';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export const STATUS_LABEL: Record<BookingStatus, string> = {
  draft: 'Draft',
  requested: 'Requested',
  accepted: 'Accepted',
  declined: 'Declined',
  needs_info: 'Needs info',
  ready: 'Ready',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
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
  overdue: 'danger',
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
