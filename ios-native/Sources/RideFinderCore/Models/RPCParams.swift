import Foundation

// One Encodable struct per RPC's `Args` shape in database.types.ts —
// parameter names (p_starts_at, p_vehicle_id, ...) match the Postgres
// function signatures exactly, since PostgREST binds RPC parameters by
// name.

public struct SearchAvailableVehiclesParams: Encodable, Sendable {
    public var pStartsAt: Date
    public var pEndsAt: Date
    public var pLocation: String?
    public var pCategory: String?
    public var pTransmission: TransmissionType?
    public var pMaxDailyRateLaari: Int?

    enum CodingKeys: String, CodingKey {
        case pStartsAt = "p_starts_at"
        case pEndsAt = "p_ends_at"
        case pLocation = "p_location"
        case pCategory = "p_category"
        case pTransmission = "p_transmission"
        case pMaxDailyRateLaari = "p_max_daily_rate_laari"
    }

    public init(
        startsAt: Date,
        endsAt: Date,
        location: String? = nil,
        category: String? = nil,
        transmission: TransmissionType? = nil,
        maxDailyRateLaari: Int? = nil
    ) {
        pStartsAt = startsAt
        pEndsAt = endsAt
        pLocation = location
        pCategory = category
        pTransmission = transmission
        pMaxDailyRateLaari = maxDailyRateLaari
    }
}

public struct VehicleIdParams: Encodable, Sendable {
    public var pVehicleId: UUID

    enum CodingKeys: String, CodingKey {
        case pVehicleId = "p_vehicle_id"
    }

    public init(vehicleId: UUID) {
        pVehicleId = vehicleId
    }
}

public struct ListingQuoteParams: Encodable, Sendable {
    public var pVehicleId: UUID
    public var pStartsAt: Date
    public var pEndsAt: Date

    enum CodingKeys: String, CodingKey {
        case pVehicleId = "p_vehicle_id"
        case pStartsAt = "p_starts_at"
        case pEndsAt = "p_ends_at"
    }

    public init(vehicleId: UUID, startsAt: Date, endsAt: Date) {
        pVehicleId = vehicleId
        pStartsAt = startsAt
        pEndsAt = endsAt
    }
}

/// `request_booking`'s params are all optional in the RPC signature
/// itself (it's also used for resubmission-after-needs_info, keyed by
/// `p_booking_id`) — see 20260821220001_booking_requirements.sql for the
/// document/deposit gates it enforces server-side.
public struct RequestBookingParams: Encodable, Sendable {
    public var pBookingId: UUID?
    public var pOrganizationId: UUID?
    public var pVehicleId: UUID?
    public var pCustomerId: UUID?
    public var pStartsAt: Date?
    public var pEndsAt: Date?
    public var pNotes: String?

    enum CodingKeys: String, CodingKey {
        case pBookingId = "p_booking_id"
        case pOrganizationId = "p_organization_id"
        case pVehicleId = "p_vehicle_id"
        case pCustomerId = "p_customer_id"
        case pStartsAt = "p_starts_at"
        case pEndsAt = "p_ends_at"
        case pNotes = "p_notes"
    }

    /// A brand-new booking request (no existing draft to resubmit).
    public init(organizationId: UUID, vehicleId: UUID, customerId: UUID, startsAt: Date, endsAt: Date, notes: String? = nil) {
        pOrganizationId = organizationId
        pVehicleId = vehicleId
        pCustomerId = customerId
        pStartsAt = startsAt
        pEndsAt = endsAt
        pNotes = notes
    }
}

public struct BookingIdParams: Encodable, Sendable {
    public var pBookingId: UUID

    enum CodingKeys: String, CodingKey {
        case pBookingId = "p_booking_id"
    }

    public init(bookingId: UUID) {
        pBookingId = bookingId
    }
}

public struct BookingIdReasonParams: Encodable, Sendable {
    public var pBookingId: UUID
    public var pReason: String?

    enum CodingKeys: String, CodingKey {
        case pBookingId = "p_booking_id"
        case pReason = "p_reason"
    }

    public init(bookingId: UUID, reason: String? = nil) {
        pBookingId = bookingId
        pReason = reason
    }
}

public struct BookingIdNoteParams: Encodable, Sendable {
    public var pBookingId: UUID
    public var pNote: String?

    enum CodingKeys: String, CodingKey {
        case pBookingId = "p_booking_id"
        case pNote = "p_note"
    }

    public init(bookingId: UUID, note: String? = nil) {
        pBookingId = bookingId
        pNote = note
    }
}
