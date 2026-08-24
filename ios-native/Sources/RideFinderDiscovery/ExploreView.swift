import RideFinderCore
import SwiftUI

/// Port of app/(customer)/(tabs)/explore.tsx's search form — native
/// `DatePicker` (`.compact` presents the system date/time picker sheet)
/// rather than a custom wheel, per AGENTS.md's native-first rule.
public struct ExploreView: View {
    private let service: DiscoveryService

    @State private var location = ""
    @State private var startsAt = Date().addingTimeInterval(3600)
    @State private var endsAt = Date().addingTimeInterval(3600 * 25)
    @State private var criteria: SearchCriteria?

    public init(service: DiscoveryService) {
        self.service = service
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Location") {
                    TextField("Malé, Hulhumalé…", text: $location)
                        .textInputAutocapitalization(.words)
                }

                Section("Pick-up") {
                    DatePicker("Date & time", selection: $startsAt)
                        .onChange(of: startsAt) {
                            if endsAt <= startsAt {
                                endsAt = startsAt.addingTimeInterval(3600 * 24)
                            }
                        }
                }

                Section("Return") {
                    DatePicker("Date & time", selection: $endsAt, in: startsAt...)
                }

                Section {
                    Button("Search availability") {
                        criteria = SearchCriteria(location: location, startsAt: startsAt, endsAt: endsAt)
                    }
                }
            }
            .navigationTitle("Find your ride")
            .navigationDestination(item: $criteria) { criteria in
                SearchResultsView(service: service, criteria: criteria)
            }
        }
    }
}
