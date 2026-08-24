import Foundation
import Supabase

/// One `SupabaseClient` for the app's lifetime, matching the Expo app's
/// own `getSupabase()` singleton (src/lib/supabase.ts). Session storage
/// is the SDK's own `KeychainLocalStorage` — the default on Apple
/// platforms (see Auth's `AuthClient.Configuration.defaultLocalStorage`)
/// — so this needs no custom Keychain code of its own to satisfy the
/// "Keychain for sensitive session data" requirement.
@MainActor
public enum SupabaseClientProvider {
    private static var cached: SupabaseClient?

    /// Throws `SupabaseEnvironment.ConfigurationError` until
    /// SUPABASE_URL/SUPABASE_ANON_KEY are filled in — see
    /// SupabaseEnvironment.swift and ios-native/README.md.
    public static func client() throws -> SupabaseClient {
        if let cached { return cached }
        let environment = try SupabaseEnvironment()
        let client = SupabaseClient(
            supabaseURL: environment.supabaseURL,
            supabaseKey: environment.supabaseAnonKey
        )
        cached = client
        return client
    }
}
