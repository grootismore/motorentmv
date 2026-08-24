import Foundation

/// One row of `search_available_vehicles()`'s result set — deliberately a
/// separate type from ``Vehicle``, since the RPC returns a flattened,
/// joined shape (an `organization_name` column, no `internal_code`/
/// `included_accessories`/timestamps) rather than a `vehicles` row.
public struct SearchVehicleResult: Codable, Identifiable, Hashable, Sendable {
    public let vehicleId: UUID
    public let organizationId: UUID
    public var organizationName: String
    public var registrationNumber: String
    public var make: String?
    public var model: String?
    public var year: Int?
    public var category: String?
    public var transmission: TransmissionType?
    public var color: String?
    public var location: String?
    public var depositAmountLaari: Int
    public var dailyRateLaari: Int?
    public var hourlyRateLaari: Int?

    public var id: UUID { vehicleId }

    enum CodingKeys: String, CodingKey {
        case vehicleId = "vehicle_id"
        case organizationId = "organization_id"
        case organizationName = "organization_name"
        case registrationNumber = "registration_number"
        case make
        case model
        case year
        case category
        case transmission
        case color
        case location
        case depositAmountLaari = "deposit_amount_laari"
        case dailyRateLaari = "daily_rate_laari"
        case hourlyRateLaari = "hourly_rate_laari"
    }

    /// Same fallback as `Vehicle.displayName` — see its own comment.
    public var displayName: String {
        let name = [make, model].compactMap { $0 }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? registrationNumber : name
    }
}

/// One row of `get_vehicle_listing()` — the listing-detail counterpart of
/// ``SearchVehicleResult``, with `included_accessories` added.
public struct VehicleListing: Codable, Identifiable, Hashable, Sendable {
    public let vehicleId: UUID
    public let organizationId: UUID
    public var organizationName: String
    public var registrationNumber: String
    public var make: String?
    public var model: String?
    public var year: Int?
    public var category: String?
    public var transmission: TransmissionType?
    public var color: String?
    public var location: String?
    public var includedAccessories: [String]
    public var depositAmountLaari: Int
    public var dailyRateLaari: Int?
    public var hourlyRateLaari: Int?

    public var id: UUID { vehicleId }

    enum CodingKeys: String, CodingKey {
        case vehicleId = "vehicle_id"
        case organizationId = "organization_id"
        case organizationName = "organization_name"
        case registrationNumber = "registration_number"
        case make
        case model
        case year
        case category
        case transmission
        case color
        case location
        case includedAccessories = "included_accessories"
        case depositAmountLaari = "deposit_amount_laari"
        case dailyRateLaari = "daily_rate_laari"
        case hourlyRateLaari = "hourly_rate_laari"
    }

    public var displayName: String {
        let name = [make, model].compactMap { $0 }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? registrationNumber : name
    }
}
