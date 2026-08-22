import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../design-system/ThemeProvider';
import { GlassSurface } from './GlassSurface';

/**
 * Shared floating Ocean Glass tab bar config for both (customer) and
 * (renter) Tabs navigators. Uses React Navigation's own documented
 * `tabBarBackground` escape hatch (a custom background behind an
 * absolutely-positioned bar) rather than a fully custom tabBar render
 * prop, so it stays typed against expo-router's public Tabs API instead
 * of reaching into its vendored react-navigation internals.
 *
 * "Floats slightly above the home indicator": tabBarStyle is
 * position: 'absolute' with side/bottom margins computed from the real
 * safe-area inset, so it clears the home indicator on every device
 * rather than a hardcoded offset.
 */
export function useOceanTabBarScreenOptions() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return {
    headerShown: false as const,
    tabBarActiveTintColor: theme.colors.lagoonPrimary,
    tabBarInactiveTintColor: theme.colors.textTertiary,
    tabBarShowLabel: true,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
    tabBarStyle: {
      position: 'absolute' as const,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      bottom: insets.bottom + theme.spacing.xs,
      height: 60,
      borderRadius: theme.radii.full,
      borderTopWidth: 0,
      backgroundColor: 'transparent',
      elevation: 0,
      paddingTop: theme.spacing.xs,
    },
    tabBarBackground: () => (
      <GlassSurface tone="strong" style={{ flex: 1, borderRadius: theme.radii.full }} />
    ),
  };
}

export type OceanTabIconName = keyof typeof Ionicons.glyphMap;

/** Renders the thin-line/filled Ionicon pair Ocean Glass uses for the
 * inactive/active tab states — call from each Tabs.Screen's tabBarIcon. */
export function oceanTabBarIcon(outline: OceanTabIconName, filled: OceanTabIconName) {
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} color={color as string} size={size} />;
  }
  return TabIcon;
}
