import RideFinderCore
import SwiftUI

/// Port of app/(auth)/role-select.tsx. "Rent a motorcycle" sets
/// `.customer` intent and needs no navigation (AppGateDecision routes to
/// `.customer` on its own once the intent is persisted); "Manage a rental
/// business" sets `.renter` intent and pushes to sign-in.
public struct RoleSelectView: View {
    @Environment(AuthStore.self) private var authStore
    @State private var navigateToSignIn = false

    public init() {}

    public var body: some View {
        NavigationStack {
            VStack(spacing: OceanGlassSpacing.xl) {
                Spacer()

                VStack(spacing: OceanGlassSpacing.sm) {
                    Text("Welcome to RideFinder")
                        .font(OceanGlassFont.largeTitle)
                        .multilineTextAlignment(.center)
                    Text("Malé and Hulhumalé motorcycle rentals")
                        .font(OceanGlassFont.body)
                        .foregroundStyle(OceanGlassColor.textSecondary)
                }

                VStack(spacing: OceanGlassSpacing.md) {
                    Button {
                        authStore.setIntent(.customer)
                    } label: {
                        Label("Rent a motorcycle", systemImage: "figure.outdoor.cycle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)

                    Button {
                        authStore.setIntent(.renter)
                        navigateToSignIn = true
                    } label: {
                        Label("Manage a rental business", systemImage: "building.2")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                }
                .padding(.horizontal, OceanGlassSpacing.xl)

                Spacer()
                Spacer()
            }
            .navigationDestination(isPresented: $navigateToSignIn) {
                SignInView()
            }
        }
    }
}
