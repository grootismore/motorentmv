import RideFinderAuth
import RideFinderCore
import SwiftUI

/// Port of app/(customer)/listing/[vehicleId].tsx + checkout/[vehicleId].tsx,
/// combined into one screen: itemized quote via `get_listing_quote`, then
/// "Request booking" (`request_booking`) gated on being signed in — PRD §5:
/// authenticate only at request submission, not to browse/quote.
public struct ListingDetailView: View {
    private let service: DiscoveryService
    private let vehicleId: UUID
    private let criteria: SearchCriteria

    @Environment(AuthStore.self) private var authStore

    @State private var listing: VehicleListing?
    @State private var quote: BookingQuote?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showingSignIn = false
    @State private var isSubmitting = false
    @State private var submittedBooking: Booking?

    public init(service: DiscoveryService, vehicleId: UUID, criteria: SearchCriteria) {
        self.service = service
        self.vehicleId = vehicleId
        self.criteria = criteria
    }

    public var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ContentUnavailableView {
                    Label("Couldn't load this listing", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(errorMessage)
                }
            } else if let listing {
                Form {
                    Section {
                        Text(listing.displayName)
                            .font(OceanGlassFont.largeTitle)
                        Text(listing.organizationName)
                            .foregroundStyle(OceanGlassColor.textSecondary)
                    }

                    Section("Your dates") {
                        LabeledContent("Pick-up", value: MaldivesTime.formatDateTime(criteria.startsAt))
                        LabeledContent("Return", value: MaldivesTime.formatDateTime(criteria.endsAt))
                    }

                    if let quote {
                        Section("Price breakdown") {
                            LabeledContent(
                                quote.rateType == .daily ? "Daily rate" : "Hourly rate",
                                value: Money.formatMvr(laari: quote.rateAmountLaari)
                            )
                            LabeledContent("Units", value: "\(quote.units)")
                            LabeledContent("Subtotal", value: Money.formatMvr(laari: quote.subtotalLaari))
                            if quote.depositAmountLaari > 0 {
                                LabeledContent("Refundable deposit", value: Money.formatMvr(laari: quote.depositAmountLaari))
                            }
                            LabeledContent("Total due at pickup", value: Money.formatMvr(laari: quote.totalLaari))
                                .fontWeight(.semibold)
                        }
                    }

                    Section {
                        Text("You won't be charged now — this sends a request to the renter, who will accept or decline it. Payment happens separately, later, and is never collected through this app at request time.")
                            .font(OceanGlassFont.caption)
                            .foregroundStyle(OceanGlassColor.textSecondary)
                    }
                }

                Button {
                    requestBookingTapped()
                } label: {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Text("Request booking")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .padding()
                .disabled(isSubmitting)
            }
        }
        .navigationTitle("Listing")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .sheet(isPresented: $showingSignIn) {
            NavigationStack { SignInView() }
        }
        .onChange(of: authStore.session) { _, newSession in
            // Signing in from the sheet above continues straight into the
            // request the customer originally tapped, rather than
            // dropping them back on the listing to tap "Request booking"
            // a second time.
            if showingSignIn, newSession != nil {
                showingSignIn = false
                Task { await submitBookingRequest() }
            }
        }
        .alert("Booking requested", isPresented: .constant(submittedBooking != nil)) {
            Button("OK") { submittedBooking = nil }
        } message: {
            Text("Your request has been sent to the renter. You'll be notified once they respond.")
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            async let listingTask = service.vehicleListing(vehicleId: vehicleId)
            async let quoteTask = service.listingQuote(vehicleId: vehicleId, startsAt: criteria.startsAt, endsAt: criteria.endsAt)
            listing = try await listingTask
            quote = try await quoteTask
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func requestBookingTapped() {
        guard authStore.session != nil else {
            showingSignIn = true
            return
        }
        Task { await submitBookingRequest() }
    }

    private func submitBookingRequest() async {
        guard let listing, let userId = authStore.session?.user.id else { return }
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }
        do {
            submittedBooking = try await service.requestBooking(
                organizationId: listing.organizationId,
                vehicleId: vehicleId,
                customerId: userId,
                startsAt: criteria.startsAt,
                endsAt: criteria.endsAt
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
