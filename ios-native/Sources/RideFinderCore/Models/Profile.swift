import Foundation

/// Mirrors the `profiles` table (database.types.ts). One row per
/// `auth.users` id, created by the `handle_new_user` trigger — this app
/// never inserts into `profiles` directly.
public struct Profile: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public var fullName: String?
    public var phone: String?
    public var email: String?
    public var avatarUrl: String?
    public var isPlatformAdmin: Bool
    public let createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case phone
        case email
        case avatarUrl = "avatar_url"
        case isPlatformAdmin = "is_platform_admin"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
