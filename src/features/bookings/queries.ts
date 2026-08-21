import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

export type Booking = Database['public']['Tables']['bookings']['Row'];
export type BookingStatus = Database['public']['Enums']['booking_status'];
export type BookingEvent = Database['public']['Tables']['booking_events']['Row'];

export interface BookingVehicleSummary {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
}

export interface BookingCustomerSummary {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

export interface BookingWithDetails extends Booking {
  vehicle: BookingVehicleSummary | null;
  customer: BookingCustomerSummary | null;
}

export interface BookingQuote {
  rate_type: Database['public']['Enums']['rate_type'];
  rate_amount_laari: number;
  units: number;
  subtotal_laari: number;
  discount_laari: number;
  delivery_fee_laari: number;
  deposit_amount_laari: number;
  total_laari: number;
  computed_at: string;
}

// The "pending" statuses a renter's inbox needs to act on; "resolved"
// statuses are historical (still visible in Bookings, just not the
// default inbox filter).
export const PENDING_BOOKING_STATUSES: BookingStatus[] = [
  'requested',
  'needs_info',
  'accepted',
  'ready',
  'active',
];

const BOOKING_SELECT =
  '*, vehicle:vehicles(id, registration_number, make, model), customer:profiles!bookings_customer_id_fkey(full_name, phone, email)';

export function useOrgBookings(organizationId: string | undefined, statuses?: BookingStatus[]) {
  return useQuery({
    queryKey: ['org-bookings', organizationId, statuses],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<BookingWithDetails[]> => {
      let query = getSupabase()
        .from('bookings')
        .select(BOOKING_SELECT)
        .eq('organization_id', organizationId as string)
        .order('starts_at', { ascending: true });
      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BookingWithDetails[];
    },
  });
}

export function useBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['booking', bookingId],
    enabled: Boolean(bookingId),
    queryFn: async (): Promise<BookingWithDetails> => {
      const { data, error } = await getSupabase()
        .from('bookings')
        .select(BOOKING_SELECT)
        .eq('id', bookingId as string)
        .single();
      if (error) throw error;
      return data as unknown as BookingWithDetails;
    },
  });
}

export function useBookingEvents(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['booking-events', bookingId],
    enabled: Boolean(bookingId),
    queryFn: async (): Promise<BookingEvent[]> => {
      const { data, error } = await getSupabase()
        .from('booking_events')
        .select('*')
        .eq('booking_id', bookingId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/** A live preview of what accepting would charge, computed the same way the
 * server does — shown before the org member commits, never sent back as
 * the source of truth (accept_booking recomputes it itself; see
 * 20260821140003). */
export function useBookingQuotePreview(
  vehicleId: string | undefined,
  startsAt: string | undefined,
  endsAt: string | undefined,
) {
  return useQuery({
    queryKey: ['booking-quote-preview', vehicleId, startsAt, endsAt],
    enabled: Boolean(vehicleId && startsAt && endsAt),
    queryFn: async (): Promise<BookingQuote> => {
      const { data, error } = await getSupabase().rpc('compute_booking_quote', {
        p_vehicle_id: vehicleId as string,
        p_starts_at: startsAt as string,
        p_ends_at: endsAt as string,
      });
      if (error) throw error;
      return data as unknown as BookingQuote;
    },
  });
}

export interface ConflictWindow {
  starts_at: string;
  ends_at: string;
  reason: string;
}

/**
 * Conflict preview for a candidate/pending booking: other confirmed
 * bookings and manual availability blocks on the same vehicle that
 * overlap this range. Reads only vehicle_busy_ranges (ranges only, no
 * customer identity — see 20260821120011) and availability_blocks, never
 * the bookings table directly, so a staff member previewing a conflict
 * never sees which other customer or booking it belongs to (PRD §6.4).
 */
export function useVehicleConflicts(
  vehicleId: string | undefined,
  startsAt: string | undefined,
  endsAt: string | undefined,
) {
  return useQuery({
    queryKey: ['vehicle-conflicts', vehicleId, startsAt, endsAt],
    enabled: Boolean(vehicleId && startsAt && endsAt),
    queryFn: async (): Promise<ConflictWindow[]> => {
      const supabase = getSupabase();
      const [busyRes, blocksRes] = await Promise.all([
        supabase
          .from('vehicle_busy_ranges')
          .select('starts_at, ends_at')
          .eq('vehicle_id', vehicleId as string)
          .lt('starts_at', endsAt as string)
          .gt('ends_at', startsAt as string),
        supabase
          .from('availability_blocks')
          .select('starts_at, ends_at, reason')
          .eq('vehicle_id', vehicleId as string)
          .lt('starts_at', endsAt as string)
          .gt('ends_at', startsAt as string),
      ]);
      if (busyRes.error) throw busyRes.error;
      if (blocksRes.error) throw blocksRes.error;
      return [
        ...busyRes.data.map((r) => ({
          starts_at: r.starts_at as string,
          ends_at: r.ends_at as string,
          reason: 'Another confirmed booking',
        })),
        ...blocksRes.data.map((r) => ({
          starts_at: r.starts_at as string,
          ends_at: r.ends_at as string,
          reason: r.reason,
        })),
      ];
    },
  });
}

function invalidateBooking(queryClient: ReturnType<typeof useQueryClient>, booking: Booking) {
  queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
  queryClient.invalidateQueries({ queryKey: ['booking-events', booking.id] });
  queryClient.invalidateQueries({ queryKey: ['org-bookings', booking.organization_id] });
}

export function useAcceptBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string): Promise<Booking> => {
      const { data, error } = await getSupabase().rpc('accept_booking', { p_booking_id: bookingId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateBooking(queryClient, data),
  });
}

export function useDeclineBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bookingId: string; reason?: string }): Promise<Booking> => {
      const { data, error } = await getSupabase().rpc('decline_booking', {
        p_booking_id: input.bookingId,
        p_reason: input.reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateBooking(queryClient, data),
  });
}

export function useMarkBookingNeedsInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bookingId: string; note?: string }): Promise<Booking> => {
      const { data, error } = await getSupabase().rpc('mark_booking_needs_info', {
        p_booking_id: input.bookingId,
        p_note: input.note ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateBooking(queryClient, data),
  });
}

export function useReadyBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string): Promise<Booking> => {
      const { data, error } = await getSupabase().rpc('ready_booking', { p_booking_id: bookingId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateBooking(queryClient, data),
  });
}

export function useActivateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string): Promise<Booking> => {
      const { data, error } = await getSupabase().rpc('activate_booking', { p_booking_id: bookingId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateBooking(queryClient, data),
  });
}

export function useCompleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string): Promise<Booking> => {
      const { data, error } = await getSupabase().rpc('complete_booking', { p_booking_id: bookingId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateBooking(queryClient, data),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bookingId: string; reason?: string }): Promise<Booking> => {
      const { data, error } = await getSupabase().rpc('cancel_booking', {
        p_booking_id: input.bookingId,
        p_reason: input.reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateBooking(queryClient, data),
  });
}
