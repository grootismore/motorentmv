/**
 * OCEAN GLASS design tokens — a premium, flat, iOS-style glass system.
 * Derived from the Ocean Glass reference image (deep-ocean gradient
 * headers, flat frosted panels over a pearl body, one saturated teal
 * "lagoon" accent for price/primary actions, chip-based status).
 *
 * Deliberately flat: no bevels, no embossed rims, no convex highlights, no
 * heavy shadows. Glass is a thin translucent sheet (see
 * src/components/GlassSurface.tsx), never an inflated/neumorphic surface.
 *
 * Back-compat: the pre-Ocean-Glass token names (`background`, `surface`,
 * `primary`, `danger`, radii `sm`/`md`/`lg`, etc.) are kept as aliases
 * mapped onto the new semantic values, so any call site not yet migrated
 * during the screen-by-screen redesign still renders correctly rather
 * than failing to compile. New code should use the semantic names below,
 * not the aliases.
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/**
 * Modest, contemporary radii — never the maximum radius on every
 * component. `full` is reserved for genuine capsules (status chips, the
 * floating tab bar), not ordinary buttons or cards.
 */
export const radii = {
  control: 10,
  chip: 12,
  card: 16,
  sheet: 24,
  full: 999,
  // Back-compat aliases (pre-Ocean-Glass names).
  sm: 10,
  md: 12,
  lg: 16,
} as const;

/** Minimum touch target size in points, per PRD accessibility NFR (§11). */
export const minTouchTarget = 44;

/**
 * Restrained motion tokens. Every animation in the app should read one of
 * these durations/curves rather than inventing its own — and every call
 * site must check `useReduceMotion()` (src/design-system/ThemeProvider.tsx)
 * before animating at all.
 */
export const motion = {
  duration: {
    fast: 150,
    standard: 250,
    sheet: 300,
    statusChange: 200,
    skeleton: 1200,
  },
  easing: {
    standard: [0.25, 0.1, 0.25, 1] as const,
  },
} as const;

/**
 * Elevation is intentionally minimal — most Ocean Glass surfaces rely on
 * background contrast, blur and a hairline border, not a shadow. `raised`
 * exists only for the rare surface that must visually separate from a
 * busy background (e.g. a hero-image overlay control) and is still far
 * lighter than a typical native "card" shadow.
 */
export const elevation = {
  none: { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  raised: {
    shadowColor: '#0B1826',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;

/**
 * iOS-like type hierarchy. System font only (San Francisco on iOS, Roboto
 * on Android) — never bundled or imitated. Each variant carries its own
 * size/lineHeight/weight so components read `typography.variant.x`
 * directly rather than composing size+weight ad hoc per screen.
 */
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  variant: {
    largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
    navigationTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
    sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
    cardTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const },
    body: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
    secondaryBody: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
    label: { fontSize: 13, lineHeight: 16, fontWeight: '500' as const },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
    numericKPI: { fontSize: 24, lineHeight: 28, fontWeight: '700' as const },
    price: { fontSize: 20, lineHeight: 24, fontWeight: '700' as const },
    buttonLabel: { fontSize: 16, lineHeight: 20, fontWeight: '600' as const },
  },
  // Back-compat aliases (pre-Ocean-Glass names).
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32 },
  lineHeight: { xs: 16, sm: 20, md: 24, lg: 28, xl: 32, xxl: 40 },
  weight: { regular: '400', medium: '500', bold: '700' },
} as const;

export type ColorTokens = { [K in keyof typeof lightColors]: string };

export const lightColors = {
  // Ocean Glass semantic palette.
  oceanBackground: '#1B3A5C',
  oceanDeep: '#0F2540',
  lagoonPrimary: '#0E6E76',
  lagoonPressed: '#0A5259',
  pearlBackground: '#F4F7F9',
  glassSurface: 'rgba(255,255,255,0.68)',
  glassSurfaceStrong: 'rgba(255,255,255,0.92)',
  glassBorder: 'rgba(15,37,64,0.08)',
  textPrimary: '#12283D',
  textSecondary: '#5C7285',
  textTertiary: '#8CA0AF',
  divider: 'rgba(15,37,64,0.08)',
  success: '#1FAE5C',
  warning: '#E3A33D',
  destructive: '#E2574C',
  information: '#3E82C9',
  overdue: '#D64B3A',
  disabled: '#B7C2CB',
  textInverse: '#FFFFFF',
  overlay: 'rgba(15, 37, 64, 0.5)',

  // Back-compat aliases (pre-Ocean-Glass names) — mapped onto the palette
  // above so any not-yet-migrated call site still renders sensibly.
  background: '#F4F7F9',
  surface: 'rgba(255,255,255,0.68)',
  surfaceAlt: 'rgba(255,255,255,0.92)',
  border: 'rgba(15,37,64,0.08)',
  primary: '#0E6E76',
  primaryText: '#FFFFFF',
  danger: '#E2574C',
  info: '#3E82C9',
} as const;

export const darkColors: ColorTokens = {
  oceanBackground: '#0B1826',
  oceanDeep: '#060E18',
  lagoonPrimary: '#3FB5BD',
  lagoonPressed: '#2E8E94',
  pearlBackground: '#0E1A24',
  glassSurface: 'rgba(20,34,46,0.62)',
  glassSurfaceStrong: 'rgba(20,34,46,0.90)',
  glassBorder: 'rgba(255,255,255,0.08)',
  textPrimary: '#EAF2F6',
  textSecondary: '#9FB3C2',
  textTertiary: '#6E8394',
  divider: 'rgba(255,255,255,0.10)',
  success: '#3ECB79',
  warning: '#F0B75B',
  destructive: '#F17C72',
  information: '#6BA6E0',
  overdue: '#F0715F',
  disabled: '#3C4C58',
  textInverse: '#0B1826',
  overlay: 'rgba(0, 0, 0, 0.6)',

  background: '#0E1A24',
  surface: 'rgba(20,34,46,0.62)',
  surfaceAlt: 'rgba(20,34,46,0.90)',
  border: 'rgba(255,255,255,0.08)',
  primary: '#3FB5BD',
  primaryText: '#0B1826',
  danger: '#F17C72',
  info: '#6BA6E0',
} as const;

/**
 * Status colors are never the only signal — pair with an icon or label.
 * (PRD §11: "non-color status cues".) Names match the Ionicons set used
 * by src/components/StatusChip.tsx.
 */
export const statusIcon = {
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'close-circle',
  info: 'information-circle',
} as const;
