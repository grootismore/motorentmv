import Foundation

/// Port of src/lib/money.ts's `formatMvr`. Money is always an integer
/// laari column (1 MVR = 100 laari), never a floating-point amount — see
/// the Postgres schema's own comment on every `*_laari` column — so this
/// takes `Int?`, not `Double`.
public enum Money {
    private static let formatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        formatter.locale = Locale(identifier: "en_US")
        return formatter
    }()

    /// `nil` -> "—" (an em dash), matching formatMvr's own null handling.
    public static func formatMvr(laari: Int?) -> String {
        guard let laari else { return "—" }
        let amount = Double(laari) / 100
        let formatted = formatter.string(from: NSNumber(value: amount)) ?? String(format: "%.2f", amount)
        return "MVR \(formatted)"
    }
}
