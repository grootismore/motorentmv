// swift-tools-version: 6.0
import PackageDescription
import AppleProductTypes

// RideFinder — native iOS client.
//
// This is opened directly in Xcode 15+ as a Swift Package app project
// (File > Open… on this Package.swift), not a traditional .xcodeproj — see
// ios-native/README.md for why, and for the (trivial) migration path to a
// conventional .xcodeproj if the team prefers one later. Everything below
// the app product itself (RideFinderCore/Auth/Discovery) is a completely
// ordinary local Swift Package, buildable and testable with `swift build`/
// `swift test` on any platform with a Swift 6 toolchain, independent of
// which project format wraps the app target.
let package = Package(
    name: "RideFinder",
    defaultLocalization: "en",
    platforms: [.iOS(.v17)],
    products: [
        .iOSApplication(
            name: "RideFinder",
            targets: ["RideFinderApp"],
            bundleIdentifier: "com.ridefinder.app",
            displayVersion: "1.0",
            bundleVersion: "1",
            supportedDeviceFamilies: [.phone],
            supportedInterfaceOrientations: [.portrait],
            capabilities: [],
            appCategory: .travel,
            additionalInfoPlistContentFilePath: "Sources/RideFinderApp/Resources/AdditionalInfo.plist"
        ),
        .library(name: "RideFinderCore", targets: ["RideFinderCore"]),
        .library(name: "RideFinderAuth", targets: ["RideFinderAuth"]),
        .library(name: "RideFinderDiscovery", targets: ["RideFinderDiscovery"]),
    ],
    dependencies: [
        // https://github.com/supabase/supabase-swift — the official Supabase
        // Swift SDK (Auth, PostgREST/.from(), Storage, Realtime, Functions).
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.0.0"),
    ],
    targets: [
        .executableTarget(
            name: "RideFinderApp",
            dependencies: ["RideFinderCore", "RideFinderAuth", "RideFinderDiscovery"],
            path: "Sources/RideFinderApp",
            resources: [.process("Resources/Assets.xcassets")]
        ),
        .target(
            name: "RideFinderCore",
            dependencies: [.product(name: "Supabase", package: "supabase-swift")],
            path: "Sources/RideFinderCore"
        ),
        .target(
            name: "RideFinderAuth",
            dependencies: ["RideFinderCore"],
            path: "Sources/RideFinderAuth"
        ),
        .target(
            name: "RideFinderDiscovery",
            dependencies: ["RideFinderCore"],
            path: "Sources/RideFinderDiscovery"
        ),
        .testTarget(
            name: "RideFinderCoreTests",
            dependencies: ["RideFinderCore"],
            path: "Tests/RideFinderCoreTests"
        ),
    ],
    swiftLanguageModes: [.v6]
)
