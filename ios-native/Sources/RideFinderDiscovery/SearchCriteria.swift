import Foundation

/// Carries a search across Explore -> Search results -> Listing detail,
/// the same three params app/(customer)/(tabs)/explore.tsx hands to
/// Search via router params.
public struct SearchCriteria: Hashable, Sendable {
    public var location: String
    public var startsAt: Date
    public var endsAt: Date

    public init(location: String, startsAt: Date, endsAt: Date) {
        self.location = location
        self.startsAt = startsAt
        self.endsAt = endsAt
    }
}
