import { useQuery } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

export type ActivityBookingEvent = Database['public']['Tables']['booking_events']['Row'] & {
  booking: {
    id: string;
    organization_id: string;
    vehicle: { registration_number: string; make: string | null; model: string | null } | null;
    customer: { full_name: string | null } | null;
  };
};

/**
 * booking_events is already the single choke point every domain writer in
 * this schema logs through -- log_booking_created() (requests),
 * transition_booking_status() (confirmations/declines/etc.),
 * log_transaction_created() (payments/refunds/adjustments), and
 * log_inspection_event() (handover/return completion). One query here
 * covers every activity type Prompt 7 asks for except a dedicated
 * "maintenance entry" event, which nothing in the schema currently logs
 * (see the Prompt 7 delivery report's Known limitations).
 *
 * `bookings!inner(...)` (not a plain left join) is what makes
 * `.eq('booking.organization_id', ...)` valid PostgREST filter syntax --
 * RLS (booking_events_select_participant) already scopes visible rows to
 * this org or the caller's own bookings, so this filter is a correctness
 * narrowing (an org member should only see their own org's feed here),
 * not the only thing standing between this query and another org's data.
 */
export function useRecentActivity(organizationId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['recent-activity', organizationId, limit],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<ActivityBookingEvent[]> => {
      const { data, error } = await getSupabase()
        .from('booking_events')
        .select(
          `*, booking:bookings!inner(
            id, organization_id,
            vehicle:vehicles(registration_number, make, model),
            customer:profiles!bookings_customer_id_fkey(full_name)
          )`,
        )
        .eq('booking.organization_id', organizationId as string)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as unknown as ActivityBookingEvent[];
    },
  });
}

/** A short, human summary line for one activity event -- deliberately
 * generic ("Booking requested", not "John's licence expires 2027-01-01")
 * since this feed's payload can include fields that shouldn't be
 * paraphrased into a persistent-looking summary without the same privacy
 * scrutiny applied to notification text (see notify_on_booking_event()'s
 * own comments) -- it only ever describes the status transition or event
 * type, never metadata contents. */
export function describeActivityEvent(event: ActivityBookingEvent): string {
  const vehicle = event.booking.vehicle;
  const vehicleLabel = vehicle
    ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || vehicle.registration_number
    : 'a vehicle';

  switch (event.event_type) {
    case 'created':
      return `New booking request for ${vehicleLabel}`;
    case 'status_change':
      return describeStatusChange(event.to_status, vehicleLabel);
    case 'payment_recorded':
      return `Payment recorded for ${vehicleLabel}`;
    case 'refund_recorded':
      return `Refund recorded for ${vehicleLabel}`;
    case 'adjustment_recorded':
      return `Adjustment recorded for ${vehicleLabel}`;
    case 'inspection_recorded':
      return `Inspection recorded for ${vehicleLabel}`;
    case 'inspection_acknowledged':
      return `Customer acknowledged inspection for ${vehicleLabel}`;
    default:
      return `Update on ${vehicleLabel}`;
  }
}

function describeStatusChange(
  toStatus: Database['public']['Enums']['booking_status'] | null,
  vehicleLabel: string,
): string {
  switch (toStatus) {
    case 'accepted':
      return `Booking confirmed for ${vehicleLabel}`;
    case 'declined':
      return `Booking declined for ${vehicleLabel}`;
    case 'needs_info':
      return `Booking needs more information — ${vehicleLabel}`;
    case 'active':
      return `Handover completed for ${vehicleLabel}`;
    case 'completed':
      return `Rental completed for ${vehicleLabel}`;
    case 'cancelled':
      return `Booking cancelled for ${vehicleLabel}`;
    default:
      return `Status updated for ${vehicleLabel}`;
  }
}
