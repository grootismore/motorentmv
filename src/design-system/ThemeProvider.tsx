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
  /** Resolved once here, not per-GlassSurface -- see the ThemeProvider
   * body below for why. */
  reduceMotion: boolean;
  reduceTransparency: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

function buildTheme(scheme: 'light' | 'dark', reduceMotion: boolean, reduceTransparency: boolean): Theme {
  return {
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radii,
    typography,
    motion,
    elevation,
    scheme,
    reduceMotion,
    reduceTransparency,
  };
}

/**
 * Resolves Reduce Motion/Reduce Transparency exactly once for the whole
 * tree, not once per GlassSurface. Every glass panel on a screen used to
 * call useReduceTransparency() independently, each spinning up its own
 * AccessibilityInfo promise + change-event subscription -- harmless in
 * isolation, but the Ocean Glass redesign put a GlassSurface on nearly
 * every card, so a single detail screen could mount a dozen+ duplicate
 * subscriptions. Real cost in the app (redundant native-bridge calls) and,
 * concretely, enough added async/timer load to intermittently blow past
 * React Testing Library's default findBy* timeout in CI on a screen with
 * several booking/payment cards. useReduceMotion()/useReduceTransparency()
 * below keep their original hook signatures -- callers don't change --
 * they just read the value ThemeProvider already resolved.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);

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

  const theme = useMemo(
    () => buildTheme(systemScheme === 'dark' ? 'dark' : 'light', reduceMotion, reduceTransparency),
    [systemScheme, reduceMotion, reduceTransparency],
  );

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
 * motion spec: "Respect Reduce Motion settings"). Resolved once, in
 * ThemeProvider -- see that component's own comment for why this isn't an
 * independent per-call subscription.
 */
export function useReduceMotion(): boolean {
  return useTheme().reduceMotion;
}

/**
 * iOS-only OS setting (resolves `false` on Android, where GlassSurface
 * already always uses the opaque fallback regardless). When true, glass
 * surfaces should skip blur/translucency entirely in favor of the same
 * opaque fallback Android uses -- "Increased Contrast compatibility"
 * from the Ocean Glass accessibility requirements. Resolved once, in
 * ThemeProvider.
 */
export function useReduceTransparency(): boolean {
  return useTheme().reduceTransparency;
}
