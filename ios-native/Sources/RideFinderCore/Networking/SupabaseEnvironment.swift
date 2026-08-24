import Foundation

/// The two values a native build needs to reach the same Supabase
/// project the Expo app uses (never a separate backend — see AGENTS.md's
/// "not a redesign of the Supabase backend" rule). Mirrors src/lib/env.ts's
/// intent (fail fast at startup on a missing/invalid value, one validated
/// place the rest of the app reads from) using this platform's own
/// convention — an Info.plist-driven config, the standard way an iOS app
/// keeps a build-time value out of source control, rather than porting
/// `.env`/EXPO_PUBLIC_* literally.
///
/// `SUPABASE_URL` / `SUPABASE_ANON_KEY` live as placeholder empty strings
/// in Sources/RideFinderApp/Resources/AdditionalInfo.plist — replace them
/// with the real project's values before building. Both are safe to
/// commit/ship once filled in (Supabase's RLS is the actual security
/// boundary, not key secrecy, same reasoning as env.ts's own comment),
/// but this repository has no project of its own checked in.
public struct SupabaseEnvironment: Sendable {
    public let supabaseURL: URL
    public let supabaseAnonKey: String

    public enum ConfigurationError: LocalizedError {
        case missingKey(String)
        case invalidURL(String)

        public var errorDescription: String? {
            switch self {
            case .missingKey(let key):
                return "Missing \(key) in Info.plist. Set it via Secrets.xcconfig — see ios-native/README.md."
            case .invalidURL(let value):
                return "SUPABASE_URL (\(value)) is not a valid URL."
            }
        }
    }

    public init(bundle: Bundle = .main) throws {
        guard let urlString = bundle.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            !urlString.isEmpty
        else {
            throw ConfigurationError.missingKey("SUPABASE_URL")
        }
        guard let url = URL(string: urlString) else {
            throw ConfigurationError.invalidURL(urlString)
        }
        guard let anonKey = bundle.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
            !anonKey.isEmpty
        else {
            throw ConfigurationError.missingKey("SUPABASE_ANON_KEY")
        }
        supabaseURL = url
        supabaseAnonKey = anonKey
    }

    public init(supabaseURL: URL, supabaseAnonKey: String) {
        self.supabaseURL = supabaseURL
        self.supabaseAnonKey = supabaseAnonKey
    }
}
