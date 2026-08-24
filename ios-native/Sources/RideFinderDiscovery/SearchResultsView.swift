import RideFinderCore
import SwiftUI

/// Port of app/(customer)/(tabs)/search.tsx — `search_available_vehicles`
/// results, native pull-to-refresh (`.refreshable`) rather than a custom
/// spinner.
public struct SearchResultsView: View {
    private let service: DiscoveryService
    private let criteria: SearchCriteria

    @State private var results: [SearchVehicleResult] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    public init(service: DiscoveryService, criteria: SearchCriteria) {
        self.service = service
        self.criteria = criteria
    }

    public var body: some View {
        Group {
            if isLoading, results.isEmpty {
                ProgressView()
            } else if let errorMessage {
                ContentUnavailableView {
                    Label("Search failed", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(errorMessage)
                } actions: {
                    Button("Retry") { Task { await load() } }
                }
            } else if results.isEmpty {
                ContentUnavailableView("Nothing available", systemImage: "bicycle", description: Text("Try a different date range or location."))
            } else {
                List(results) { result in
                    NavigationLink(value: result.vehicleId) {
                        SearchResultRow(result: result)
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Available near you")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: UUID.self) { vehicleId in
            ListingDetailView(service: service, vehicleId: vehicleId, criteria: criteria)
        }
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            results = try await service.searchAvailableVehicles(
                startsAt: criteria.startsAt,
                endsAt: criteria.endsAt,
                location: criteria.location.isEmpty ? nil : criteria.location
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct SearchResultRow: View {
    let result: SearchVehicleResult

    var body: some View {
        HStack(spacing: OceanGlassSpacing.md) {
            Image(systemName: "bicycle")
                .font(.title2)
                .foregroundStyle(OceanGlassColor.lagoonPrimary)
                .frame(width: 44, height: 44)
                .background(OceanGlassColor.lagoonPrimary.opacity(0.12), in: .rect(cornerRadius: OceanGlassRadius.control))

            VStack(alignment: .leading, spacing: OceanGlassSpacing.xxs) {
                Text(result.displayName)
                    .font(OceanGlassFont.cardTitle)
                Text([result.organizationName, result.location].compactMap { $0 }.joined(separator: " · "))
                    .font(OceanGlassFont.secondaryBody)
                    .foregroundStyle(OceanGlassColor.textSecondary)
            }

            Spacer()

            if let dailyRateLaari = result.dailyRateLaari {
                Text("\(Money.formatMvr(laari: dailyRateLaari))/day")
                    .font(OceanGlassFont.price)
                    .foregroundStyle(OceanGlassColor.lagoonPrimary)
            } else if let hourlyRateLaari = result.hourlyRateLaari {
                Text("\(Money.formatMvr(laari: hourlyRateLaari))/hr")
                    .font(OceanGlassFont.price)
                    .foregroundStyle(OceanGlassColor.lagoonPrimary)
            }
        }
        .padding(.vertical, OceanGlassSpacing.xs)
    }
}
