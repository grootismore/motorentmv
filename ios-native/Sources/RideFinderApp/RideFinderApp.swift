import RideFinderAuth
import RideFinderCore
import RideFinderDiscovery
import SwiftUI

@main
struct RideFinderApp: App {
    @State private var authStore = AuthStore()

    var body: some Scene {
        WindowGroup {
            RootContentView()
                .environment(authStore)
        }
    }
}

/// Resolves `SupabaseEnvironment` once at the root, so an unconfigured
/// build (no SUPABASE_URL/SUPABASE_ANON_KEY yet — see
/// SupabaseEnvironment.swift) shows one clear screen instead of crashing
/// deep inside whichever RPC call happens to run first.
private struct RootContentView: View {
    var body: some View {
        switch Result(catching: { try SupabaseClientProvider.client() }) {
        case .success(let client):
            RootGateView {
                CustomerTabView(service: DiscoveryService(client: client))
            } renterContent: {
                RenterPlaceholderView()
            }
        case .failure(let error):
            UnconfiguredView(message: error.localizedDescription)
        }
    }
}

private struct RenterPlaceholderView: View {
    var body: some View {
        NavigationStack {
            ContentUnavailableView(
                "Renter dashboard",
                systemImage: "building.2",
                description: Text("Not yet built in this native rebuild — see ios-native/README.md.")
            )
            .navigationTitle("Dashboard")
        }
    }
}

private struct UnconfiguredView: View {
    let message: String

    var body: some View {
        ContentUnavailableView {
            Label("Supabase isn't configured", systemImage: "gearshape.2")
        } description: {
            Text(message)
        }
    }
}
