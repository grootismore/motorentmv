import Foundation

/// Mirrors the `notifications` table. Named `AppNotification`, not
/// `Notification`, to avoid colliding with Foundation's own
/// `Notification` (NotificationCenter) type.
public struct AppNotification: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let recipientId: UUID
    public var type: String
    public var payload: JSONValue
    public var readAt: Date?
    public var deliveryStatus: String
    public var deliveredAt: Date?
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case recipientId = "recipient_id"
        case type
        case payload
        case readAt = "read_at"
        case deliveryStatus = "delivery_status"
        case deliveredAt = "delivered_at"
        case createdAt = "created_at"
    }
}
