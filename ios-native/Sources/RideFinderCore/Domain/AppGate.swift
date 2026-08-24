import Foundation

/// Port of src/features/auth/computeAppGate.ts — the single decision
/// table both `app/_layout.tsx` and `app/index.tsx` read in the Expo app
/// to decide which route group is mounted. Kept a pure function with no
/// dependency on ``AuthStore``/Supabase, so it's testable in isolation
/// the same way the TS version's own doc comment explains.
public enum AppGate: Sendable {
    case loading
    case auth
    case customer
    case renter
}

/// Whether the signed-out-or-signed-in user has chosen to browse as a
/// customer or a rental business — set once on the role-select screen and
/// persisted (see the TS `experience-intent.tsx`'s own history: it used
/// to be in-memory only, which meant every app restart silently defaulted
/// a returning customer into "create your organization" onboarding).
public enum ExperienceIntent: Sendable {
    case customer
    case renter
}

public enum AppGateDecision {
    /// - Parameters:
    ///   - hasSession: `nil` while the session is still being restored
    ///     from Keychain.
    ///   - hasMembership: whether the signed-in user has an active
    ///     `organization_members` row.
    ///   - isMembershipLoading: whether that membership check is still
    ///     in flight.
    ///   - intent: the persisted role-select choice, if any.
    ///   - isIntentLoading: whether the persisted intent is still being
    ///     read back (e.g. from `UserDefaults`) — treated the same as
    ///     "session still restoring" so a returning user is never routed
    ///     on a false "no intent recorded yet" for the one tick before it
    ///     resolves.
    ///
    /// Real membership always wins over the one-time role-select tap: a
    /// signed-in user who already owns or joined an organization is a
    /// renter no matter which button they originally pressed.
    ///
    /// A signed-out user who has explicitly chosen customer intent goes
    /// straight to `.customer` — browsing/search/listing detail/quote are
    /// all anonymous by design (PRD §5: authenticate only at request
    /// submission, not to window-shop). A fresh user with no intent yet,
    /// and one who chose "manage a rental business", both still go
    /// through `.auth` first.
    ///
    /// A signed-in user with no organization and no known customer
    /// intent (most commonly: a customer who signed in once to submit a
    /// booking, closed the app, and reopened it) goes back to `.auth`,
    /// not `.renter` — defaulting to renter onboarding here would
    /// silently push every such returning customer into "create your
    /// organization". Re-asking role-select is honest about not knowing.
    public static func compute(
        hasSession: Bool?,
        hasMembership: Bool,
        isMembershipLoading: Bool,
        intent: ExperienceIntent?,
        isIntentLoading: Bool
    ) -> AppGate {
        guard let hasSession else { return .loading }
        if isIntentLoading { return .loading }
        if !hasSession { return intent == .customer ? .customer : .auth }
        if hasMembership { return .renter }
        if isMembershipLoading { return .loading }
        if intent == .customer { return .customer }
        return .auth
    }
}
