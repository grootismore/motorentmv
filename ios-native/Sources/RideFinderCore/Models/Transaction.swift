import Foundation

/// Mirrors the `transactions` table — the manual payment ledger. `type ==
/// .payment` with `bookingId == nil` and `category != nil` is standalone
/// income (20260821200001_transactions_standalone_income.sql); every
/// other row ties back to a booking.
public struct Transaction: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public var bookingId: UUID?
    public let organizationId: UUID
    public var type: TransactionType
    public var method: PaymentMethod?
    public var amountLaari: Int
    public var reference: String?
    public var note: String?
    public var recordedBy: UUID
    public var occurredAt: Date
    public let createdAt: Date
    public var category: String?

    enum CodingKeys: String, CodingKey {
        case id
        case bookingId = "booking_id"
        case organizationId = "organization_id"
        case type
        case method
        case amountLaari = "amount_laari"
        case reference
        case note
        case recordedBy = "recorded_by"
        case occurredAt = "occurred_at"
        case createdAt = "created_at"
        case category
    }
}

/// Mirrors the `expenses` table — separate from `transactions`, an
/// owner/manager-only operating-cost ledger.
public struct Expense: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let organizationId: UUID
    public var vehicleId: UUID?
    public var category: String
    public var amountLaari: Int
    public var occurredOn: Date
    public var note: String?
    public var recordedBy: UUID
    public let createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case vehicleId = "vehicle_id"
        case category
        case amountLaari = "amount_laari"
        case occurredOn = "occurred_on"
        case note
        case recordedBy = "recorded_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
