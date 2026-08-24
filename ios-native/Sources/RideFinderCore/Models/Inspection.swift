import Foundation

/// Mirrors the `inspections` table — one row per pickup/return checklist.
public struct Inspection: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let bookingId: UUID
    public var inspectionType: InspectionType
    public var odometerKm: Int?
    public var fuelBatteryPercent: Int?
    public var conditionNotes: String?
    public var accessoriesChecklist: JSONValue
    public var performedBy: UUID
    public var acknowledgedBy: UUID?
    public var acknowledgedAt: Date?
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case bookingId = "booking_id"
        case inspectionType = "inspection_type"
        case odometerKm = "odometer_km"
        case fuelBatteryPercent = "fuel_battery_percent"
        case conditionNotes = "condition_notes"
        case accessoriesChecklist = "accessories_checklist"
        case performedBy = "performed_by"
        case acknowledgedBy = "acknowledged_by"
        case acknowledgedAt = "acknowledged_at"
        case createdAt = "created_at"
    }
}
