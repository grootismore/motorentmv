import { useMutation, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import type { Booking } from '../bookings/queries';

interface SubmitBookingRequestInput {
  organizationId: string;
  vehicleId: string;
  customerId: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
}

/**
 * Retry-safe by construction, not just by convention: request_booking()
 * (20260821140003) checks for an existing draft/requested/needs_info row
 * matching the same (vehicle, customer, starts_at, ends_at) tuple before
 * inserting — a partial unique index backs that check against a genuine
 * race, not just a courtesy read — and returns the existing row instead
 * of creating a duplicate. That's what makes both `retry` below (a
 * transient network failure) and a user tapping "Try again" after one
 * safe: replaying the exact same call can never create two requests for
 * the same rental.
 */
export function useSubmitBookingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitBookingRequestInput): Promise<Booking> => {
      const { data, error } = await getSupabase().rpc('request_booking', {
        p_organization_id: input.organizationId,
        p_vehicle_id: input.vehicleId,
        p_customer_id: input.customerId,
        p_starts_at: input.startsAt,
        p_ends_at: input.endsAt,
        p_notes: input.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    // A dropped connection/timeout is exactly the case idempotency exists
    // for — retrying the identical call is safe, so let TanStack Query
    // retry automatically once before asking the customer to tap "Try
    // again" themselves.
    retry: 1,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-bookings', data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['booking', data.id] });
    },
  });
}
