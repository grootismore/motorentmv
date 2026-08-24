import Foundation

/// Mirrors the `bookings` table. `quoteSnapshot`/`policySnapshot` are only
/// populated once a booking is accepted (frozen by `bookings_guard()` —
/// see 20260821140001_booking_pricing_and_guard_hardening.sql); decode
/// them into ``BookingQuote``/`JSONValue` where present rather than a
/// fixed non-optional shape.
public struct Booking: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let organizationId: UUID
    public let vehicleId: UUID
    public let customerId: UUID
    public var status: BookingStatus
    public var startsAt: Date
    public var endsAt: Date
    public var quoteSnapshot: BookingQuote?
    public var policySnapshot: JSONValue?
    public var currency: String
    public var totalAmountLaari: Int?
    public var paymentStatus: PaymentStatus
    public var notes: String?
    public let createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case vehicleId = "vehicle_id"
        case customerId = "customer_id"
        case status
        case startsAt = "starts_at"
        case endsAt = "ends_at"
        case quoteSnapshot = "quote_snapshot"
        case policySnapshot = "policy_snapshot"
        case currency
        case totalAmountLaari = "total_amount_laari"
        case paymentStatus = "payment_status"
        case notes
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// Mirrors the `booking_events` audit-trail table — one row per status
/// transition (and the initial creation), written by the transition RPCs.
public struct BookingEvent: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let bookingId: UUID
    public var actorId: UUID?
    public var eventType: String
    public var fromStatus: BookingStatus?
    public var toStatus: BookingStatus?
    public var metadata: JSONValue
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case bookingId = "booking_id"
        case actorId = "actor_id"
        case eventType = "event_type"
        case fromStatus = "from_status"
        case toStatus = "to_status"
        case metadata
        case createdAt = "created_at"
    }
}

/// The exact `jsonb_build_object(...)` shape `compute_booking_quote()` /
/// `get_listing_quote()` return (20260821140001_booking_pricing_and_guard_
/// hardening.sql) — every field here is one the RPC actually sets; adding
/// a field this app expects but the function doesn't return is exactly
/// the "invented backend behavior" AGENTS.md rules out.
public struct BookingQuote: Codable, Hashable, Sendable {
    public var rateType: RateType
    public var rateAmountLaari: Int
    public var units: Int
    public var subtotalLaari: Int
    public var discountLaari: Int
    public var deliveryFeeLaari: Int
    public var depositAmountLaari: Int
    public var totalLaari: Int
    public var computedAt: Date

    enum CodingKeys: String, CodingKey {
        case rateType = "rate_type"
        case rateAmountLaari = "rate_amount_laari"
        case units
        case subtotalLaari = "subtotal_laari"
        case discountLaari = "discount_laari"
        case deliveryFeeLaari = "delivery_fee_laari"
        case depositAmountLaari = "deposit_amount_laari"
        case totalLaari = "total_laari"
        case computedAt = "computed_at"
    }
}
