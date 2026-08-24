import Foundation
import Testing

@testable import RideFinderCore

// Mirrors src/lib/datetime.test.ts's cases exactly. Indian/Maldives is a
// fixed UTC+5 offset, no DST -- 20:00 UTC on Jan 1 always renders as
// 01:00 on Jan 2 there, regardless of when/where this test runs.
@Suite struct MaldivesTimeTests {
    private static func utc(_ iso: String) -> Date {
        ISO8601DateFormatter().date(from: iso)!
    }

    private static let instant = utc("2026-01-01T20:00:00Z")

    @Test func formatsDateTimeInMaldives() {
        #expect(MaldivesTime.formatDateTime(Self.instant) == "02 Jan 2026, 01:00")
    }

    @Test func formatsJustTheDate() {
        #expect(MaldivesTime.formatDate(Self.instant) == "02 Jan 2026")
    }

    @Test func formatsJustTheTime() {
        #expect(MaldivesTime.formatTime(Self.instant) == "01:00")
    }

    @Test func formatsCompactWeekdayDayMonth() {
        #expect(MaldivesTime.formatDateShort(Self.instant) == "Fri, 2 Jan")
    }

    @Test func formats12HourTime() {
        #expect(MaldivesTime.formatTime12h(Self.instant) == "1:00 AM")
    }

    @Test func derivesTheMaldivesCalendarDay() {
        #expect(MaldivesTime.dateKey(Self.instant) == "2026-01-02")
    }

    @Test func convertsMaldivesLocalInputToTheEquivalentUtcInstant() {
        // 01:00 on Jan 2 in Maldives (UTC+5) is 20:00 on Jan 1 UTC.
        let result = MaldivesTime.inputToDate(dateString: "2026-01-02", timeString: "01:00")
        #expect(result == Self.utc("2026-01-01T20:00:00Z"))
    }

    @Test func roundTripsWithDateToInput() {
        let date = MaldivesTime.inputToDate(dateString: "2026-06-15", timeString: "14:30")
        #expect(date != nil)
        let input = MaldivesTime.dateToInput(date!)
        #expect(input.date == "2026-06-15")
        #expect(input.time == "14:30")
    }

    @Test func returnsNilForUnparseableInput() {
        #expect(MaldivesTime.inputToDate(dateString: "not-a-date", timeString: "99:99") == nil)
    }

    @Test func derivesTheMaldivesLocalDateAndTimeFromAUtcInstant() {
        let input = MaldivesTime.dateToInput(Self.instant)
        #expect(input.date == "2026-01-02")
        #expect(input.time == "01:00")
    }

    @Test func isPastIsTrueForAnInstantInThePast() {
        #expect(MaldivesTime.isPast(Self.utc("2000-01-01T00:00:00Z")))
    }

    @Test func isPastIsFalseForAnInstantInTheFuture() {
        #expect(!MaldivesTime.isPast(Self.utc("2099-01-01T00:00:00Z")))
    }

    @Test func derivesTheMaldivesCalendarYearMonth() {
        // 20:00 UTC on 2026-01-01 is 01:00 on 2026-01-02 in Maldives --
        // same month here, but this is the same offset rule that matters
        // at a month boundary.
        let first = MaldivesTime.yearMonth(Self.instant)
        #expect(first.year == 2026)
        #expect(first.month == 1)

        let boundary = MaldivesTime.yearMonth(Self.utc("2026-01-31T20:00:00Z"))
        #expect(boundary.year == 2026)
        #expect(boundary.month == 2)
    }

    @Test func returnsTheUtcInstantBoundsOfAMaldivesLocalCalendarMonth() {
        // Maldives midnight on 2026-08-01 is 2026-07-31T19:00:00Z.
        let range = MaldivesTime.monthRange(year: 2026, month: 8)
        #expect(range.start == Self.utc("2026-07-31T19:00:00Z"))
        #expect(range.end == Self.utc("2026-08-31T19:00:00Z"))
    }

    @Test func rollsOverIntoTheNextYearWhenMonthIs13() {
        let range = MaldivesTime.monthRange(year: 2026, month: 13)
        let expected = MaldivesTime.monthRange(year: 2027, month: 1)
        #expect(range.start == expected.start)
    }

    @Test func rollsBackIntoThePreviousYearWhenMonthIs0() {
        let range = MaldivesTime.monthRange(year: 2026, month: 0)
        let expected = MaldivesTime.monthRange(year: 2025, month: 12)
        #expect(range.start == expected.start)
    }

    @Test func previousMonthGoesBackOneMonthWithinTheSameYear() {
        let result = MaldivesTime.previousMonth(year: 2026, month: 8)
        #expect(result.year == 2026 && result.month == 7)
    }

    @Test func previousMonthRollsBackToDecemberOfThePriorYearFromJanuary() {
        let result = MaldivesTime.previousMonth(year: 2026, month: 1)
        #expect(result.year == 2025 && result.month == 12)
    }

    @Test func nextMonthGoesForwardOneMonthWithinTheSameYear() {
        let result = MaldivesTime.nextMonth(year: 2026, month: 8)
        #expect(result.year == 2026 && result.month == 9)
    }

    @Test func nextMonthRollsForwardToJanuaryOfTheNextYearFromDecember() {
        let result = MaldivesTime.nextMonth(year: 2026, month: 12)
        #expect(result.year == 2027 && result.month == 1)
    }
}
