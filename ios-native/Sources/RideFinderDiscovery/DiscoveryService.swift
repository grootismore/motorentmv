import Foundation
import RideFinderCore
import Supabase

/// Port of src/features/discovery/queries.ts — thin wrappers around the
/// four discovery/booking RPCs, calling `client.rpc(...)` directly rather
/// than a hand-rolled REST request. No RLS/business logic lives here: the
/// RPCs already enforce "available vehicles only", the document/deposit
/// gates, and the overlap-safe accept — this only shapes the calls and
/// decodes the results.
public struct DiscoveryService: Sendable {
    private let client: SupabaseClient

    public init(client: SupabaseClient) {
        self.client = client
    }

    /// `search_available_vehicles` — anonymous-reachable (PRD §5: browse
    /// without an account).
    public func searchAvailableVehicles(
        startsAt: Date,
        endsAt: Date,
        location: String? = nil,
        category: String? = nil,
        transmission: TransmissionType? = nil,
        maxDailyRateLaari: Int? = nil
    ) async throws -> [SearchVehicleResult] {
        try await client
            .rpc(
                "search_available_vehicles",
                params: SearchAvailableVehiclesParams(
                    startsAt: startsAt,
                    endsAt: endsAt,
                    location: location,
                    category: category,
                    transmission: transmission,
                    maxDailyRateLaari: maxDailyRateLaari
                )
            )
            .execute()
            .value
    }

    /// `get_vehicle_listing` — returns no row (not an error) for a
    /// vehicle that isn't currently available; see that RPC's own SQL
    /// comment.
    public func vehicleListing(vehicleId: UUID) async throws -> VehicleListing? {
        let rows: [VehicleListing] = try await client
            .rpc("get_vehicle_listing", params: VehicleIdParams(vehicleId: vehicleId))
            .execute()
            .value
        return rows.first
    }

    /// `get_listing_quote` — the same itemized numbers `accept_booking()`
    /// will freeze later, reachable before sign-in.
    public func listingQuote(vehicleId: UUID, startsAt: Date, endsAt: Date) async throws -> BookingQuote {
        try await client
            .rpc(
                "get_listing_quote",
                params: ListingQuoteParams(vehicleId: vehicleId, startsAt: startsAt, endsAt: endsAt)
            )
            .execute()
            .value
    }

    /// `request_booking` — the customer-facing side of the booking state
    /// machine's first transition (-> `.requested`). Enforces the
    /// license/ID-on-file gate server-side
    /// (20260821220001_booking_requirements.sql); a `PostgrestError`
    /// surfaces that rejection the same way every other RPC error does,
    /// there is no separate client-side bypass to keep in sync.
    public func requestBooking(
        organizationId: UUID,
        vehicleId: UUID,
        customerId: UUID,
        startsAt: Date,
        endsAt: Date,
        notes: String? = nil
    ) async throws -> Booking {
        try await client
            .rpc(
                "request_booking",
                params: RequestBookingParams(
                    organizationId: organizationId,
                    vehicleId: vehicleId,
                    customerId: customerId,
                    startsAt: startsAt,
                    endsAt: endsAt,
                    notes: notes
                )
            )
            .execute()
            .value
    }
}
