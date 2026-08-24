import SwiftUI

// Port of src/design-system/tokens.ts's Ocean Glass palette — the same
// deep-ocean navy, lagoon-teal accent, and pearl body this app's identity
// is built on (AGENTS.md's "preserve existing design direction"), not a
// redesign. Typography deliberately does NOT port the TS side's fixed
// point sizes 1:1: this native app leans on SwiftUI's own Dynamic Type
// text styles (`.font(.title)`, `.font(.headline)`, ...) instead, since
// AGENTS.md's own native-first rule ("native accessibility semantics")
// argues against hardcoding sizes Dynamic Type would otherwise scale for
// a user who has increased their preferred text size — Typography.swift
// maps each TS variant to the closest matching system text style rather
// than its literal point size.

extension Color {
    /// A color that resolves differently in light/dark appearance,
    /// mirroring the TS side's separate `lightColors`/`darkColors` tables
    /// (src/design-system/tokens.ts) instead of one fixed value.
    init(light: Color, dark: Color) {
        #if canImport(UIKit)
            self = Color(
                UIColor { traits in
                    traits.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light)
                }
            )
        #else
            self = light
        #endif
    }

    /// Parses a `rgba(r, g, b, a)` CSS-style string, matching the
    /// several TS tokens (glassSurface, glassBorder, ...) expressed that
    /// way rather than as hex, so the two token tables stay visually
    /// comparable side by side.
    init(rgba: String) {
        let digits = rgba
            .replacingOccurrences(of: "rgba(", with: "")
            .replacingOccurrences(of: ")", with: "")
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
        guard digits.count == 4,
            let r = Double(digits[0]), let g = Double(digits[1]), let b = Double(digits[2]), let a = Double(digits[3])
        else {
            self = .clear
            return
        }
        self.init(red: r / 255, green: g / 255, blue: b / 255, opacity: a)
    }

    /// Parses a `#RRGGBB` hex string.
    init(hex: String) {
        var hexValue: UInt64 = 0
        Scanner(string: hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))).scanHexInt64(&hexValue)
        let r = Double((hexValue & 0xFF0000) >> 16) / 255
        let g = Double((hexValue & 0x00FF00) >> 8) / 255
        let b = Double(hexValue & 0x0000FF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

public enum OceanGlassColor {
    public static let oceanBackground = Color(light: Color(hex: "#1B3A5C"), dark: Color(hex: "#0B1826"))
    public static let oceanDeep = Color(light: Color(hex: "#0F2540"), dark: Color(hex: "#060E18"))
    public static let lagoonPrimary = Color(light: Color(hex: "#0E6E76"), dark: Color(hex: "#3FB5BD"))
    public static let lagoonPressed = Color(light: Color(hex: "#0A5259"), dark: Color(hex: "#2E8E94"))
    public static let pearlBackground = Color(light: Color(hex: "#F4F7F9"), dark: Color(hex: "#0E1A24"))

    /// The opaque fallback surface — this native app has no BlurView-
    /// style manual fallback path (see GlassSurface.swift): a real
    /// `.regularMaterial`/`.ultraThinMaterial` is available unconditionally
    /// on every iOS 17+ device, so this token exists only for the rare
    /// non-material surface (e.g. inside a context where a Material
    /// would double up on an already-materialed ancestor).
    public static let glassSurface = Color(light: Color(rgba: "rgba(255,255,255,0.68)"), dark: Color(rgba: "rgba(52,72,92,0.62)"))
    public static let glassSurfaceStrong = Color(light: Color(rgba: "rgba(255,255,255,0.92)"), dark: Color(rgba: "rgba(52,72,92,0.90)"))
    public static let glassBorder = Color(light: Color(rgba: "rgba(15,37,64,0.08)"), dark: Color(rgba: "rgba(255,255,255,0.08)"))
    public static let tabActivePill = Color(light: Color(rgba: "rgba(14,110,118,0.14)"), dark: Color(rgba: "rgba(63,181,189,0.20)"))

    public static let textPrimary = Color(light: Color(hex: "#12283D"), dark: Color(hex: "#EAF2F6"))
    public static let textSecondary = Color(light: Color(hex: "#5C7285"), dark: Color(hex: "#9FB3C2"))
    public static let textTertiary = Color(light: Color(hex: "#8CA0AF"), dark: Color(hex: "#6E8394"))
    public static let divider = Color(light: Color(rgba: "rgba(15,37,64,0.08)"), dark: Color(rgba: "rgba(255,255,255,0.10)"))

    public static let success = Color(light: Color(hex: "#1FAE5C"), dark: Color(hex: "#3ECB79"))
    public static let warning = Color(light: Color(hex: "#E3A33D"), dark: Color(hex: "#F0B75B"))
    public static let destructive = Color(light: Color(hex: "#E2574C"), dark: Color(hex: "#F17C72"))
    public static let information = Color(light: Color(hex: "#3E82C9"), dark: Color(hex: "#6BA6E0"))
    public static let overdue = Color(light: Color(hex: "#D64B3A"), dark: Color(hex: "#F0715F"))
    public static let disabled = Color(light: Color(hex: "#B7C2CB"), dark: Color(hex: "#3C4C58"))
    public static let textInverse = Color(light: .white, dark: Color(hex: "#0B1826"))

    /// Always light in both schemes — for text/icons sitting directly on
    /// the ocean-navy gradient/tab-bar tint, which never lightens with
    /// scheme. See the TS token's own comment for why this must stay
    /// separate from `textInverse`.
    public static let oceanForeground = Color(hex: "#F4F9FC")
}

public enum OceanGlassSpacing {
    public static let xxs: CGFloat = 2
    public static let xs: CGFloat = 4
    public static let sm: CGFloat = 8
    public static let md: CGFloat = 12
    public static let lg: CGFloat = 16
    public static let xl: CGFloat = 20
    public static let xxl: CGFloat = 24
    public static let xxxl: CGFloat = 32
    public static let huge: CGFloat = 48
}

/// Modest, contemporary radii — `full` is reserved for genuine capsules
/// (status chips), not ordinary buttons or cards.
public enum OceanGlassRadius {
    public static let control: CGFloat = 10
    public static let chip: CGFloat = 12
    public static let card: CGFloat = 16
    public static let sheet: CGFloat = 24
    public static let full: CGFloat = 999
}

/// Minimum touch target size in points, per PRD accessibility NFR (§11).
public let minTouchTarget: CGFloat = 44

/// Maps each TS `typography.variant` to the closest native Dynamic Type
/// text style — see this file's top-level doc comment for why these
/// aren't fixed point sizes.
public enum OceanGlassFont {
    public static let largeTitle = Font.largeTitle.weight(.bold)
    public static let navigationTitle = Font.headline
    public static let sectionTitle = Font.headline
    public static let cardTitle = Font.headline
    public static let body = Font.body
    public static let secondaryBody = Font.subheadline
    public static let label = Font.footnote.weight(.medium)
    public static let caption = Font.caption
    public static let numericKPI = Font.title2.weight(.bold)
    public static let price = Font.title3.weight(.bold)
    public static let buttonLabel = Font.body.weight(.semibold)
}
