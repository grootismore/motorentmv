import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { Text, View } from 'react-native';
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
    // The label renders inside oceanTabBarIcon's own pill now, alongside
    // the icon, instead of as React Navigation's separate default label
    // element — that's what lets the active tab's highlight wrap icon+label
    // together as one capsule (the reference's "Home" pill) rather than
    // tinting two disconnected pieces of text/icon the same color.
    tabBarShowLabel: false,
    tabBarItemStyle: { paddingVertical: 2 },
    tabBarStyle: {
      position: 'absolute' as const,
      left: theme.spacing.xl,
      right: theme.spacing.xl,
      bottom: insets.bottom + theme.spacing.sm,
      // Tall enough for icon + label + the active pill's own padding to sit
      // comfortably (56pt is the low end of the compact tab bar guidance),
      // now that the label renders inside the pill instead of below it.
      height: 58,
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
const TAB_ICON_SIZE = 20;

/**
 * Renders the thin-line/filled Ionicon pair plus its label as one unit —
 * call from each Tabs.Screen's tabBarIcon. The active tab wraps icon+label
 * in a soft tinted capsule (`tabActivePill`) instead of only tinting the
 * icon/label color, matching the segmented-pill tab bar reference (a
 * distinct rounded highlight behind the selected item, not color alone).
 */
export function oceanTabBarIcon(outline: OceanTabIconName, filled: OceanTabIconName, label: string) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    const theme = useTheme();
    return (
      <View
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          paddingHorizontal: focused ? theme.spacing.md : theme.spacing.sm,
          paddingVertical: 4,
          borderRadius: theme.radii.full,
          backgroundColor: focused ? theme.colors.tabActivePill : 'transparent',
        }}
      >
        <Ionicons name={focused ? filled : outline} color={color as string} size={TAB_ICON_SIZE} />
        <Text style={{ color: color as string, fontSize: 10, fontWeight: focused ? '700' : '600' }}>
          {label}
        </Text>
      </View>
    );
  }
  return TabIcon;
}
