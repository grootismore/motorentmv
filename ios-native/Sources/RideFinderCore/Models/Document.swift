import Foundation

/// Mirrors the `documents` table — a single row type covering booking
/// documents, customer license/ID documents, and vehicle/inspection
/// photos; which foreign key is populated depends on `documentType`. See
/// 20260821210001_customer_documents_storage.sql and
/// 20260821160004_booking_documents_storage.sql for the storage-bucket
/// RLS this schema pairs with.
public struct DocumentRecord: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public var organizationId: UUID?
    public var vehicleId: UUID?
    public var bookingId: UUID?
    public var profileId: UUID?
    public var expenseId: UUID?
    public var documentType: DocumentType
    public var storagePath: String
    public var status: DocumentStatus
    public var expiresAt: Date?
    public var uploadedBy: UUID
    public var verifiedBy: UUID?
    public var verifiedAt: Date?
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case vehicleId = "vehicle_id"
        case bookingId = "booking_id"
        case profileId = "profile_id"
        case expenseId = "expense_id"
        case documentType = "document_type"
        case storagePath = "storage_path"
        case status
        case expiresAt = "expires_at"
        case uploadedBy = "uploaded_by"
        case verifiedBy = "verified_by"
        case verifiedAt = "verified_at"
        case createdAt = "created_at"
    }
}
