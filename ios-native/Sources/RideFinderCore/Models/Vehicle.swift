import Foundation

/// Mirrors the `vehicles` table.
public struct Vehicle: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let organizationId: UUID
    public var internalCode: String?
    public var registrationNumber: String
    public var make: String?
    public var model: String?
    public var year: Int?
    public var category: String?
    public var transmission: TransmissionType?
    public var engineSizeCc: Int?
    public var color: String?
    public var status: VehicleStatus
    public var odometerKm: Int
    /// Integer laari (1 MVR = 100 laari) — see Money.swift, never a Double.
    public var depositAmountLaari: Int
    public var location: String?
    public var includedAccessories: [String]
    public let createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case internalCode = "internal_code"
        case registrationNumber = "registration_number"
        case make
        case model
        case year
        case category
        case transmission
        case engineSizeCc = "engine_size_cc"
        case color
        case status
        case odometerKm = "odometer_km"
        case depositAmountLaari = "deposit_amount_laari"
        case location
        case includedAccessories = "included_accessories"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    /// Same fallback the customer-facing screens use when make/model are
    /// blank (VehicleResultItem.tsx's vehicleLabel) — the registration
    /// number, never an empty string.
    public var displayName: String {
        let name = [make, model].compactMap { $0 }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? registrationNumber : name
    }
}

/// Mirrors the `vehicle_rates` table — one row per (vehicle, rate_type)
/// with an effective date range; `effective_to == nil` means "current".
public struct VehicleRate: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let vehicleId: UUID
    public var rateType: RateType
    public var amountLaari: Int
    public var effectiveFrom: Date
    public var effectiveTo: Date?
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case vehicleId = "vehicle_id"
        case rateType = "rate_type"
        case amountLaari = "amount_laari"
        case effectiveFrom = "effective_from"
        case effectiveTo = "effective_to"
        case createdAt = "created_at"
    }
}

/// Mirrors the `availability_blocks` table — a manual maintenance/
/// unavailability window a renter sets on a vehicle, distinct from a
/// booking.
public struct AvailabilityBlock: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let vehicleId: UUID
    public var startsAt: Date
    public var endsAt: Date
    public var reason: String
    public var createdBy: UUID?
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case vehicleId = "vehicle_id"
        case startsAt = "starts_at"
        case endsAt = "ends_at"
        case reason
        case createdBy = "created_by"
        case createdAt = "created_at"
    }
}

/// Mirrors the `vehicle_maintenance_records` table — a queryable service
/// history entry, separate from the payment ledger (`transactions`).
public struct VehicleMaintenanceRecord: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let organizationId: UUID
    public let vehicleId: UUID
    public var description: String
    public var costLaari: Int?
    public var odometerKmAtService: Int?
    public var performedOn: Date
    public var recordedBy: UUID
    public let createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case vehicleId = "vehicle_id"
        case description
        case costLaari = "cost_laari"
        case odometerKmAtService = "odometer_km_at_service"
        case performedOn = "performed_on"
        case recordedBy = "recorded_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
