/**
 * Design tokens. Deliberately small for Phase 0 — enough for navigable shells
 * and shared state primitives, not a full component library. Colors are
 * chosen for WCAG AA contrast (>=4.5:1) against their paired background.
 *
 * `primary` reuses the accent blue from the PRD document itself (#1877A8) as
 * a placeholder brand color — branding is explicitly unconfirmed, see PRD
 * "Working title" note.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
} as const;

/** Minimum touch target size in points, per PRD accessibility NFR (§11). */
export const minTouchTarget = 44;

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 40,
  },
  weight: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
} as const;

export type ColorTokens = { [K in keyof typeof lightColors]: string };

export const lightColors = {
  background: '#FFFFFF',
  surface: '#F4F6F8',
  surfaceAlt: '#EAF4F7',
  border: '#D7DEE3',
  textPrimary: '#15324A',
  textSecondary: '#4B5A66',
  textInverse: '#FFFFFF',
  primary: '#1877A8',
  primaryText: '#FFFFFF',
  success: '#1B7A4B',
  warning: '#8A5A00',
  danger: '#B3241C',
  info: '#1877A8',
  overlay: 'rgba(21, 50, 74, 0.5)',
} as const;

export const darkColors: ColorTokens = {
  background: '#0B1620',
  surface: '#132434',
  surfaceAlt: '#0F2A38',
  border: '#28414F',
  textPrimary: '#F4F8FA',
  textSecondary: '#B7C4CC',
  textInverse: '#15324A',
  primary: '#5FB1DE',
  primaryText: '#0B1620',
  success: '#5FD79A',
  warning: '#F2C14E',
  danger: '#F2887D',
  info: '#5FB1DE',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

/**
 * Status colors are never the only signal — pair with an icon or label.
 * (PRD §11: "non-color status cues".)
 */
export const statusIcon = {
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  info: 'info',
} as const;
