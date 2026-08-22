import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { View } from 'react-native';
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
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const, marginTop: 0 },
    tabBarItemStyle: { paddingVertical: 2 },
    tabBarStyle: {
      position: 'absolute' as const,
      left: theme.spacing.xl,
      right: theme.spacing.xl,
      bottom: insets.bottom + theme.spacing.sm,
      height: 52,
      borderRadius: theme.radii.full,
      borderTopWidth: 0,
      backgroundColor: 'transparent',
      elevation: 0,
      paddingTop: theme.spacing.xs,
    },
    // The shadow lives on this plain outer View, not on GlassSurface
    // itself: GlassSurface clips its own blur/background layers with
    // overflow:'hidden', which on iOS also clips any shadow set on that
    // same view down to nothing. Without this wrapper the bar had zero
    // elevation and, combined with the dark-mode glass/background colors
    // once being only ~5 RGB units apart (see tokens.ts), was
    // indistinguishable from a flat continuation of the page on a real
    // device -- confirmed from physical-device screenshots, not a
    // hypothetical. tone="default" (not "strong") for a lighter, more
    // visibly translucent bar -- "strong" is meant for financial/form
    // content that wants to read as more solid, not the tab bar.
    tabBarBackground: () => (
      <View style={{ flex: 1, borderRadius: theme.radii.full, ...theme.elevation.raised }}>
        <GlassSurface tone="default" style={{ flex: 1, borderRadius: theme.radii.full }} />
      </View>
    ),
  };
}

export type OceanTabIconName = keyof typeof Ionicons.glyphMap;

/** Compact icon size for the floating tab bar — deliberately smaller than
 * React Navigation's own default (~25pt), per the Ocean Glass "compact
 * icons, reduced height" tab bar spec; the `size` React Navigation passes
 * in is ignored on purpose. */
const TAB_ICON_SIZE = 22;

/** Renders the thin-line/filled Ionicon pair Ocean Glass uses for the
 * inactive/active tab states — call from each Tabs.Screen's tabBarIcon. */
export function oceanTabBarIcon(outline: OceanTabIconName, filled: OceanTabIconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} color={color as string} size={TAB_ICON_SIZE} />;
  }
  return TabIcon;
}
