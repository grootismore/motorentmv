import Testing

@testable import RideFinderCore

// Mirrors src/lib/money.test.ts's cases exactly.
@Suite struct MoneyTests {
    @Test func formatsIntegerLaariAsMvrWithTwoDecimalPlaces() {
        #expect(Money.formatMvr(laari: 100_000) == "MVR 1,000.00")
    }

    @Test func formatsZero() {
        #expect(Money.formatMvr(laari: 0) == "MVR 0.00")
    }

    @Test func handlesANonRoundLaariAmount() {
        #expect(Money.formatMvr(laari: 1250) == "MVR 12.50")
    }

    @Test func rendersADashForNil() {
        #expect(Money.formatMvr(laari: nil) == "—")
    }
}
