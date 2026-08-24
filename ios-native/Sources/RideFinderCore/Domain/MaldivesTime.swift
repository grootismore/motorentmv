import Foundation

/// Port of src/lib/datetime.ts. Everything is stored in UTC (PRD §6.2);
/// every screen shows it in Indian/Maldives (UTC+5, no DST) — never the
/// device's own time zone, so a staff member and a customer looking at
/// the same booking always see the same wall-clock time regardless of
/// where their phone thinks it is. `Date` itself carries no time zone
/// (like the TS side's UTC-instant `Date`/ISO string), so every function
/// below takes/returns a plain `Date` and only applies ``maldivesTimeZone``
/// for display or for interpreting a wall-clock input.
public enum MaldivesTime {
    public static let maldivesTimeZone = TimeZone(identifier: "Indian/Maldives")!

    private static func calendar() -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = maldivesTimeZone
        return calendar
    }

    private static func formatter(dateFormat: String) -> DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = dateFormat
        formatter.timeZone = maldivesTimeZone
        formatter.locale = Locale(identifier: "en_GB")
        return formatter
    }

    /// e.g. "24 Aug 2026, 21:38".
    public static func formatDateTime(_ date: Date) -> String {
        formatter(dateFormat: "dd MMM yyyy, HH:mm").string(from: date)
    }

    /// e.g. "24 Aug 2026".
    public static func formatDate(_ date: Date) -> String {
        formatter(dateFormat: "dd MMM yyyy").string(from: date)
    }

    /// e.g. "21:38" (24-hour).
    public static func formatTime(_ date: Date) -> String {
        formatter(dateFormat: "HH:mm").string(from: date)
    }

    /// e.g. "Mon, 24 Aug" — a picker-style summary, distinct from
    /// ``formatDate`` (which includes the year, for booking/receipt
    /// contexts).
    public static func formatDateShort(_ date: Date) -> String {
        formatter(dateFormat: "EEE, d MMM").string(from: date)
    }

    /// e.g. "9:38 PM" (12-hour) — distinct from ``formatTime`` (24-hour,
    /// used in booking/timeline contexts).
    public static func formatTime12h(_ date: Date) -> String {
        let formatter = formatter(dateFormat: "h:mm a")
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: date)
    }

    /// "YYYY-MM-DD" for the given instant, as a Maldives calendar day.
    public static func dateKey(_ date: Date) -> String {
        formatter(dateFormat: "yyyy-MM-dd").string(from: date)
    }

    public static func isPast(_ date: Date) -> Bool {
        date < Date()
    }

    /// A "YYYY-MM-DD"/"HH:mm" pair, entered as Maldives wall-clock time
    /// (e.g. from a search date/time picker), converted to a UTC instant
    /// for storage/RPC params. `nil` for unparseable input rather than
    /// throwing, so a form can validate before submitting.
    public static func inputToDate(dateString: String, timeString: String) -> Date? {
        let combined = "\(dateString)T\(timeString):00"
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        formatter.timeZone = maldivesTimeZone
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.date(from: combined)
    }

    /// The inverse of ``inputToDate(dateString:timeString:)`` — for
    /// pre-filling a form from an existing instant (e.g. editing a
    /// previously chosen search range).
    public static func dateToInput(_ date: Date) -> (date: String, time: String) {
        (date: formatter(dateFormat: "yyyy-MM-dd").string(from: date), time: formatter(dateFormat: "HH:mm").string(from: date))
    }

    /// The Maldives calendar (year, month) the given instant falls on —
    /// month is 1-12 — e.g. for bucketing transactions/expenses by
    /// Maldives-local month, not UTC month.
    public static func yearMonth(_ date: Date) -> (year: Int, month: Int) {
        let components = calendar().dateComponents([.year, .month], from: date)
        return (year: components.year!, month: components.month!)
    }

    /// The UTC instant range [start, end) covering one Maldives-local
    /// calendar month, given any (year, month) pair — used to fetch/
    /// bucket a single month's transactions or expenses. `month` outside
    /// 1-12 rolls the year over (matching Calendar's own DateComponents
    /// normalization), mirroring the TS side's explicit
    /// `normalizeYearMonth`.
    public static func monthRange(year: Int, month: Int) -> (start: Date, end: Date) {
        var startComponents = DateComponents()
        startComponents.year = year
        startComponents.month = month
        startComponents.day = 1
        startComponents.timeZone = maldivesTimeZone

        var endComponents = DateComponents()
        endComponents.year = year
        endComponents.month = month + 1
        endComponents.day = 1
        endComponents.timeZone = maldivesTimeZone

        let calendar = calendar()
        guard let start = calendar.date(from: startComponents), let end = calendar.date(from: endComponents) else {
            preconditionFailure("Invalid year/month for MaldivesTime.monthRange: \(year)/\(month)")
        }
        return (start: start, end: end)
    }

    /// The (year, month) pair immediately before the given one.
    public static func previousMonth(year: Int, month: Int) -> (year: Int, month: Int) {
        month == 1 ? (year: year - 1, month: 12) : (year: year, month: month - 1)
    }

    /// The (year, month) pair immediately after the given one.
    public static func nextMonth(year: Int, month: Int) -> (year: Int, month: Int) {
        month == 12 ? (year: year + 1, month: 1) : (year: year, month: month + 1)
    }
}
