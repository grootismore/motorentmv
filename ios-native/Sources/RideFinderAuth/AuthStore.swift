import Foundation
import Observation
import RideFinderCore
import Supabase

/// The Expo app's `AuthProvider` + `useMyMembership` + `experience-intent.tsx`,
/// combined into one `@Observable` store. Session persistence is the
/// Supabase SDK's own Keychain-backed storage (see
/// SupabaseClientProvider.swift); this store only adds the two things the
/// SDK doesn't already track — the current organization membership, and
/// the persisted role-select intent — and folds all three into
/// ``AppGateDecision``.
@MainActor
@Observable
public final class AuthStore {
    public private(set) var session: Session?
    /// `nil` until the initial session restore (from Keychain) completes.
    private var hasRestoredSession = false

    public private(set) var membership: OrganizationMember?
    public private(set) var isMembershipLoading = false

    public private(set) var intent: ExperienceIntent?
    public private(set) var isIntentLoading = true

    public private(set) var lastError: (any Error)?

    private let intentStorageKey = "ridefinder.experience-intent"
    private var authStateTask: Task<Void, Never>?

    public init() {
        loadPersistedIntent()
    }

    public var gate: AppGate {
        AppGateDecision.compute(
            hasSession: hasRestoredSession ? (session != nil) : nil,
            hasMembership: membership != nil,
            isMembershipLoading: isMembershipLoading,
            intent: intent,
            isIntentLoading: isIntentLoading
        )
    }

    /// Restores the persisted session (if any) and starts listening for
    /// sign-in/sign-out/token-refresh events — call once from the app's
    /// root view's `.task`.
    public func start() async {
        guard authStateTask == nil else { return }
        guard let client = try? SupabaseClientProvider.client() else {
            // No SUPABASE_URL/SUPABASE_ANON_KEY configured yet -- see
            // SupabaseEnvironment.swift. Treat as signed-out rather than
            // crashing the app on first launch of an unconfigured build.
            hasRestoredSession = true
            return
        }
        authStateTask = Task { [weak self] in
            for await (event, session) in client.auth.authStateChanges {
                guard let self else { return }
                await self.handleAuthChange(event: event, session: session)
            }
        }
    }

    private func handleAuthChange(event: AuthChangeEvent, session: Session?) async {
        self.session = session
        hasRestoredSession = true
        if session != nil {
            await refreshMembership()
        } else {
            membership = nil
        }
    }

    public func refreshMembership() async {
        guard let session, let client = try? SupabaseClientProvider.client() else { return }
        isMembershipLoading = true
        defer { isMembershipLoading = false }
        do {
            let members: [OrganizationMember] = try await client
                .from("organization_members")
                .select()
                .eq("user_id", value: session.user.id)
                .eq("status", value: MemberStatus.active.rawValue)
                .limit(1)
                .execute()
                .value
            membership = members.first
        } catch {
            lastError = error
        }
    }

    public func signIn(email: String, password: String) async throws {
        let client = try SupabaseClientProvider.client()
        _ = try await client.auth.signIn(email: email, password: password)
    }

    public func signUp(email: String, password: String) async throws {
        let client = try SupabaseClientProvider.client()
        _ = try await client.auth.signUp(email: email, password: password)
    }

    public func signOut() async {
        guard let client = try? SupabaseClientProvider.client() else { return }
        try? await client.auth.signOut()
        setIntent(nil)
    }

    public func setIntent(_ newIntent: ExperienceIntent?) {
        intent = newIntent
        let defaults = UserDefaults.standard
        switch newIntent {
        case .customer: defaults.set("customer", forKey: intentStorageKey)
        case .renter: defaults.set("renter", forKey: intentStorageKey)
        case nil: defaults.removeObject(forKey: intentStorageKey)
        }
    }

    /// `UserDefaults` here plays the same role AsyncStorage plays for the
    /// TS `experience-intent.tsx` -- a plain, unencrypted, non-sensitive
    /// per-device preference (which button was tapped on role-select),
    /// not session data. Session data itself never touches this; it's the
    /// Supabase SDK's own Keychain storage exclusively.
    private func loadPersistedIntent() {
        let stored = UserDefaults.standard.string(forKey: intentStorageKey)
        switch stored {
        case "customer": intent = .customer
        case "renter": intent = .renter
        default: intent = nil
        }
        isIntentLoading = false
    }
}
