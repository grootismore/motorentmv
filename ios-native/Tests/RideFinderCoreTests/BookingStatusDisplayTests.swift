import Foundation
import Testing

@testable import RideFinderCore

// Mirrors src/features/bookings/status.test.ts's cases exactly.
@Suite struct BookingStatusDisplayTests {
    private static let future = ISO8601DateFormatter().date(from: "2099-01-01T00:00:00Z")!
    private static let past = ISO8601DateFormatter().date(from: "2000-01-01T00:00:00Z")!

    @Test func labelsAPlainStatusAsIs() {
        let result = BookingStatusDisplay.display(status: .requested, endsAt: Self.future)
        #expect(result.label == "Requested")
        #expect(result.tone == .info)
    }

    @Test func showsAnActiveBookingWhoseReturnTimeHasPassedAsOverdue() {
        let result = BookingStatusDisplay.display(status: .active, endsAt: Self.past)
        #expect(result.label == "Overdue")
        #expect(result.tone == .overdue)
    }

    @Test func doesNotTreatAFutureEndingActiveBookingAsOverdue() {
        let result = BookingStatusDisplay.display(status: .active, endsAt: Self.future)
        #expect(result.label == "Active")
        #expect(result.tone == .success)
    }

    @Test func doesNotTreatANonActiveBookingWithAPastEndDateAsOverdue() {
        let result = BookingStatusDisplay.display(status: .completed, endsAt: Self.past)
        #expect(result.label == "Completed")
        #expect(result.tone == .neutral)
    }

    @Test func labelsAnAcceptedBookingAsConfirmed() {
        let result = BookingStatusDisplay.display(status: .accepted, endsAt: Self.future)
        #expect(result.label == "Confirmed")
        #expect(result.tone == .info)
    }

    @Test func labelsAReadyBookingAsReadyForPickup() {
        let result = BookingStatusDisplay.display(status: .ready, endsAt: Self.future)
        #expect(result.label == "Ready for pickup")
        #expect(result.tone == .info)
    }

    @Test func labelsADeclinedBookingAsRejected() {
        let result = BookingStatusDisplay.display(status: .declined, endsAt: Self.future)
        #expect(result.label == "Rejected")
        #expect(result.tone == .danger)
    }

    @Test func labelsANoShowBookingDistinctlyFromAPlainCancellation() {
        let result = BookingStatusDisplay.display(status: .noShow, endsAt: Self.future)
        #expect(result.label == "No-show")
        #expect(result.tone == .danger)
    }
}
