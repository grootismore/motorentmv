import Foundation

/// Port of src/features/bookings/status.ts.
public enum StatusTone: Sendable {
    case neutral
    case info
    case warning
    case success
    case danger
    case overdue
}

/// Labels follow a later vocabulary revision (e.g. "accepted" displays as
/// "Confirmed") even though the underlying enum keeps its original PRD
/// names (accepted, declined, ready, ...) — see the TS booking_no_show
/// migration's own doc comment for why the schema itself isn't renamed.
/// `needsInfo` has no revised-vocabulary equivalent and keeps its
/// existing label unchanged.
public enum BookingStatusDisplay {
    public static let statusLabel: [BookingStatus: String] = [
        .draft: "Draft",
        .requested: "Requested",
        .accepted: "Confirmed",
        .declined: "Rejected",
        .needsInfo: "Needs info",
        .ready: "Ready for pickup",
        .active: "Active",
        .completed: "Completed",
        .cancelled: "Cancelled",
        .overdue: "Overdue",
        .noShow: "No-show",
    ]

    private static let statusTone: [BookingStatus: StatusTone] = [
        .draft: .neutral,
        .requested: .info,
        .accepted: .info,
        .declined: .danger,
        .needsInfo: .warning,
        .ready: .info,
        .active: .success,
        .completed: .neutral,
        .cancelled: .neutral,
        .overdue: .overdue,
        .noShow: .danger,
    ]

    /// `overdue` exists as a `booking_status` value, but nothing writes
    /// it — no scheduled job flips it automatically (see
    /// supabase/local-dev/README.md). Instead, an active booking whose
    /// return time has passed is treated as overdue for display purposes
    /// only, computed here from `endsAt` each time it's shown — the
    /// stored status stays `.active` until an org member completes or
    /// cancels it.
    public static func display(status: BookingStatus, endsAt: Date) -> (label: String, tone: StatusTone) {
        if status == .active, MaldivesTime.isPast(endsAt) {
            return (statusLabel[.overdue]!, statusTone[.overdue]!)
        }
        return (statusLabel[status]!, statusTone[status]!)
    }
}
