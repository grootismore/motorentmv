import Foundation

/// Mirrors the `organizations` table. `businessHours`/`policies` are
/// stored as arbitrary jsonb — kept as `JSONValue` rather than a fixed
/// Swift shape, since the schema doesn't constrain their contents either.
public struct Organization: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let createdBy: UUID
    public var name: String
    public var slug: String
    public var status: String
    public var currency: String
    public var timezone: String
    public var defaultLocation: String?
    public var businessHours: JSONValue
    public var policies: JSONValue
    public let createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case createdBy = "created_by"
        case name
        case slug
        case status
        case currency
        case timezone
        case defaultLocation = "default_location"
        case businessHours = "business_hours"
        case policies
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// Mirrors the `organization_members` table — the join between a profile
/// and an organization, with a role and invite/active/revoked lifecycle.
public struct OrganizationMember: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let organizationId: UUID
    public let userId: UUID
    public var role: OrgRole
    public var status: MemberStatus
    public var invitedBy: UUID?
    public let createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case userId = "user_id"
        case role
        case status
        case invitedBy = "invited_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
