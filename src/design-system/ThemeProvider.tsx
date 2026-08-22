import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import {
  darkColors,
  elevation,
  lightColors,
  motion,
  radii,
  spacing,
  typography,
  type ColorTokens,
} from './tokens';

export interface Theme {
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  motion: typeof motion;
  elevation: typeof elevation;
  scheme: 'light' | 'dark';
}

const ThemeContext = createContext<Theme | null>(null);

function buildTheme(scheme: 'light' | 'dark'): Theme {
  return {
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radii,
    typography,
    motion,
    elevation,
    scheme,
  };
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const theme = useMemo(() => buildTheme(systemScheme === 'dark' ? 'dark' : 'light'), [systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}

/**
 * Every animation in the app must check this before running (Ocean Glass
 * motion spec: "Respect Reduce Motion settings"). Defaults to `false`
 * (motion allowed) until the OS setting resolves, then stays in sync via
 * the change event -- a user who enables Reduce Motion mid-session
 * doesn't need to restart the app for it to take effect.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

/**
 * iOS-only OS setting (resolves `false` on Android, where GlassSurface
 * already always uses the opaque fallback regardless). When true, glass
 * surfaces should skip blur/translucency entirely in favor of the same
 * opaque fallback Android uses -- "Increased Contrast compatibility"
 * from the Ocean Glass accessibility requirements.
 */
export function useReduceTransparency(): boolean {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((value) => {
      if (mounted) setReduceTransparency(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceTransparency;
}
