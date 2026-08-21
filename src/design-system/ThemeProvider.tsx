import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, radii, spacing, typography, type ColorTokens } from './tokens';

export interface Theme {
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  scheme: 'light' | 'dark';
}

const ThemeContext = createContext<Theme | null>(null);

function buildTheme(scheme: 'light' | 'dark'): Theme {
  return {
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radii,
    typography,
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
