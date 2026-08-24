import RideFinderCore
import SwiftUI

/// Port of app/_layout.tsx + app/index.tsx combined — the one place that
/// reads ``AuthStore/gate`` and mounts the matching route group. Unlike
/// the Expo app (Stack.Protected route groups), this is a plain `switch`
/// over ``AppGate`` since there's no file-based router here.
public struct RootGateView<CustomerContent: View, RenterContent: View>: View {
    @Environment(AuthStore.self) private var authStore
    private let customerContent: () -> CustomerContent
    private let renterContent: () -> RenterContent

    public init(
        @ViewBuilder customerContent: @escaping () -> CustomerContent,
        @ViewBuilder renterContent: @escaping () -> RenterContent
    ) {
        self.customerContent = customerContent
        self.renterContent = renterContent
    }

    public var body: some View {
        Group {
            switch authStore.gate {
            case .loading:
                ProgressView()
            case .auth:
                RoleSelectView()
            case .customer:
                customerContent()
            case .renter:
                renterContent()
            }
        }
        .task {
            await authStore.start()
        }
    }
}
