import RideFinderAuth
import RideFinderCore
import SwiftUI

/// Port of app/(customer)/(tabs)/_layout.tsx's tab bar. Native `TabView`
/// (`UITabBarController` under the hood) rather than a custom bottom bar.
/// Only Explore is a real, RPC-backed screen in this vertical slice — see
/// ios-native/README.md's roadmap for My Bookings and Profile.
public struct CustomerTabView: View {
    private let service: DiscoveryService

    public init(service: DiscoveryService) {
        self.service = service
    }

    public var body: some View {
        TabView {
            ExploreView(service: service)
                .tabItem { Label("Explore", systemImage: "safari") }

            ComingSoonView(title: "My Bookings", systemImage: "calendar")
                .tabItem { Label("Bookings", systemImage: "calendar") }

            ComingSoonView(title: "Profile", systemImage: "person.crop.circle")
                .tabItem { Label("Profile", systemImage: "person.crop.circle") }
        }
    }
}

/// A clearly-labeled placeholder — never presented as if it were a real,
/// working screen (rule #9: don't claim something exists when it
/// doesn't).
struct ComingSoonView: View {
    let title: String
    let systemImage: String

    var body: some View {
        NavigationStack {
            ContentUnavailableView(title, systemImage: systemImage, description: Text("Not yet built in this native rebuild — see ios-native/README.md."))
                .navigationTitle(title)
        }
    }
}
