import { useQuery } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import type { BookingQuote } from '../bookings/queries';

export type VehicleSearchResult =
  Database['public']['Functions']['search_available_vehicles']['Returns'][number];
export type VehicleListing = Database['public']['Functions']['get_vehicle_listing']['Returns'][number];

export interface SearchCriteria {
  startsAt: string;
  endsAt: string;
  location?: string;
  category?: string;
  transmission?: Database['public']['Enums']['transmission_type'];
  maxDailyRateLaari?: number;
}

/**
 * Anonymous-safe: search_available_vehicles() is granted to both anon
 * and authenticated (Prompt 5) — browsing never requires a session. The
 * server, not this hook, is what guarantees "only bookable vehicles for
 * this exact UTC interval" (overlap-checked against confirmed bookings
 * and availability blocks inside the RPC) — this just calls it.
 */
export function useSearchVehicles(criteria: SearchCriteria | undefined) {
  return useQuery({
    queryKey: ['search-vehicles', criteria],
    enabled: Boolean(criteria),
    queryFn: async (): Promise<VehicleSearchResult[]> => {
      const c = criteria as SearchCriteria;
      const { data, error } = await getSupabase().rpc('search_available_vehicles', {
        p_starts_at: c.startsAt,
        p_ends_at: c.endsAt,
        p_location: c.location || null,
        p_category: c.category || null,
        p_transmission: c.transmission ?? null,
        p_max_daily_rate_laari: c.maxDailyRateLaari ?? null,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useVehicleListing(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-listing', vehicleId],
    enabled: Boolean(vehicleId),
    queryFn: async (): Promise<VehicleListing | null> => {
      const { data, error } = await getSupabase().rpc('get_vehicle_listing', {
        p_vehicle_id: vehicleId as string,
      });
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

export function useListingQuote(
  vehicleId: string | undefined,
  startsAt: string | undefined,
  endsAt: string | undefined,
) {
  return useQuery({
    queryKey: ['listing-quote', vehicleId, startsAt, endsAt],
    enabled: Boolean(vehicleId && startsAt && endsAt),
    queryFn: async (): Promise<BookingQuote> => {
      const { data, error } = await getSupabase().rpc('get_listing_quote', {
        p_vehicle_id: vehicleId as string,
        p_starts_at: startsAt as string,
        p_ends_at: endsAt as string,
      });
      if (error) throw error;
      return data as unknown as BookingQuote;
    },
  });
}

/**
 * A freshness re-check, not a security boundary (see
 * 20260821150001_customer_discovery.sql) — search results can go stale
 * while a customer keeps browsing, so the listing screen re-checks this
 * right before enabling "Request to book".
 */
export function useVehicleBookable(
  vehicleId: string | undefined,
  startsAt: string | undefined,
  endsAt: string | undefined,
) {
  return useQuery({
    queryKey: ['vehicle-bookable', vehicleId, startsAt, endsAt],
    enabled: Boolean(vehicleId && startsAt && endsAt),
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await getSupabase().rpc('is_vehicle_bookable', {
        p_vehicle_id: vehicleId as string,
        p_starts_at: startsAt as string,
        p_ends_at: endsAt as string,
      });
      if (error) throw error;
      return data;
    },
  });
}
