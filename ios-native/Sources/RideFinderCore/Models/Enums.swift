import Foundation

// Every case here is copied verbatim from the `Enums` section of
// src/lib/database.types.ts (generated from supabase/migrations/) — the
// Postgres enum types are the source of truth, not this file. Do not add,
// rename, or remove a case without a corresponding migration; see
// AGENTS.md's "never invent database fields or backend behavior" rule.

public enum OrgRole: String, Codable, CaseIterable, Sendable {
    case owner
    case manager
    case staff
}

public enum RateType: String, Codable, CaseIterable, Sendable {
    case hourly
    case daily
}

public enum DocumentType: String, Codable, CaseIterable, Sendable {
    case license
    case idCard = "id_card"
    case vehiclePhoto = "vehicle_photo"
    case inspectionPhotoBefore = "inspection_photo_before"
    case inspectionPhotoAfter = "inspection_photo_after"
    case receipt
    case other
}

public enum MemberStatus: String, Codable, CaseIterable, Sendable {
    case invited
    case active
    case revoked
}

/// See src/features/bookings/status.ts's own comment: display labels follow
/// a later vocabulary revision (e.g. "accepted" displays as "Confirmed"),
/// but the stored enum values themselves were never renamed. Keep these
/// raw values matching the Postgres enum, and put any display-label
/// remapping in BookingStatusDisplay.swift instead of here.
public enum BookingStatus: String, Codable, CaseIterable, Sendable {
    case draft
    case requested
    case accepted
    case declined
    case needsInfo = "needs_info"
    case ready
    case active
    case completed
    case cancelled
    case overdue
    case noShow = "no_show"
}

public enum PaymentMethod: String, Codable, CaseIterable, Sendable {
    case cash
    case bankTransfer = "bank_transfer"
    case externalReference = "external_reference"
}

public enum PaymentStatus: String, Codable, CaseIterable, Sendable {
    case unpaid
    case partiallyPaid = "partially_paid"
    case paid
    case partiallyRefunded = "partially_refunded"
    case refunded
}

public enum VehicleStatus: String, Codable, CaseIterable, Sendable {
    case draft
    case available
    case reserved
    case rented
    case maintenance
    case inactive
}

public enum DocumentStatus: String, Codable, CaseIterable, Sendable {
    case pending
    case verified
    case rejected
}

public enum InspectionType: String, Codable, CaseIterable, Sendable {
    case pickup
    case returnInspection = "return"
}

public enum TransactionType: String, Codable, CaseIterable, Sendable {
    case payment
    case refund
    case adjustment
}

public enum TransmissionType: String, Codable, CaseIterable, Sendable {
    case automatic
    case manual
}
