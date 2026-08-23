import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../design-system/ThemeProvider';
import { GlassSurface } from './GlassSurface';

/**
 * Customer-only floating tab bar: a segmented glass capsule (Explore,
 * Bookings, Profile) with Search detached into its own circular glass
 * button, matching the "Renata" reference — a main pill plus a visually
 * separate circular action, not one continuous full-width bar. Renter
 * navigation is untouched (see src/components/oceanTabBar.tsx); this file
 * exists precisely so this customer-specific layout doesn't leak into that
 * shared renter component.
 *
 * Passed as `<Tabs tabBar={(props) => <CustomerGlassTabBar {...props} />}>`
 * — a full custom tabBar, not tabBarBackground/tabBarButton. Those escape
 * hatches render every route inside ONE shared background/row, which
 * cannot express two independently-shaped, visually separated surfaces
 * with real background visible in the gap between them.
 */

/** Total vertical footprint of this bar, from the screen's absolute bottom
 * edge to its top edge, given the real bottom safe-area inset. The one
 * place every customer screen's bottom content padding should come from —
 * see src/components/Screen.tsx and app/(customer)/explore.tsx, both of
 * which reserve at least this much so scrollable content can clear the
 * floating bar instead of guessing a number that goes stale if this bar's
 * own dimensions change. */
export const CUSTOMER_TAB_BAR_HEIGHT = 68;
export const CUSTOMER_TAB_BAR_BOTTOM_GAP = 12;
const CUSTOMER_TAB_BAR_HORIZONTAL_MARGIN = 24;
const CUSTOMER_TAB_BAR_ITEM_GAP = 12;
const CAPSULE_ICON_SIZE = 24;
const SEARCH_ICON_SIZE = 26;

type OceanTabIconName = keyof typeof Ionicons.glyphMap;

/** Route names that render inside the main capsule, in the order they
 * appear there — independent of the underlying Tabs.Screen declaration
 * order, so reordering screens in app/(customer)/_layout.tsx (were that
 * ever needed) wouldn't silently reorder this bar too. */
const CAPSULE_TABS: { name: string; outline: OceanTabIconName; filled: OceanTabIconName; label: string }[] = [
  { name: 'explore', outline: 'compass-outline', filled: 'compass', label: 'Explore' },
  { name: 'bookings/index', outline: 'calendar-outline', filled: 'calendar', label: 'Bookings' },
  { name: 'profile/index', outline: 'person-outline', filled: 'person', label: 'Profile' },
];

const SEARCH_ROUTE_NAME = 'search';
const SEARCH_ICON: { outline: OceanTabIconName; filled: OceanTabIconName } = {
  outline: 'search-outline',
  filled: 'search',
};

/**
 * The subset of React Navigation's BottomTabBarProps this component reads.
 * Declared locally instead of importing expo-router's vendored (non-public)
 * bottom-tabs type, matching src/components/oceanTabBar.tsx's existing
 * policy on this exact point.
 */
interface TabRoute {
  key: string;
  name: string;
  params?: object;
}

interface TabDescriptor {
  options: { tabBarAccessibilityLabel?: string };
}

interface TabNavigationLike {
  navigate: (name: string, params?: object) => void;
  // Method-shorthand syntax (not `emit: (event) => ...`) is deliberate:
  // it gets TypeScript's bivariant parameter checking, which is what lets
  // this narrower local type be assigned from the real, more specific
  // navigation.emit signature (whose `type` param is a literal union, not
  // `string`) -- the same reasoning as oceanTabBar.tsx's OceanTabButtonProps
  // needing `| null` on its callback props for the same kind of mismatch.
  emit(event: { type: string; target: string; canPreventDefault?: boolean }): { defaultPrevented: boolean };
}

export interface CustomerGlassTabBarProps {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, TabDescriptor>;
  navigation: TabNavigationLike;
  insets: { bottom: number };
}

export function CustomerGlassTabBar({ state, descriptors, navigation, insets }: CustomerGlassTabBarProps) {
  const theme = useTheme();
  const focusedKey = state.routes[state.index]?.key;

  const goTo = (route: TabRoute) => {
    const isFocused = route.key === focusedKey;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const longPress = (route: TabRoute) => navigation.emit({ type: 'tabLongPress', target: route.key });

  const accessibilityLabelFor = (routeKey: string, fallback: string) =>
    descriptors[routeKey]?.options.tabBarAccessibilityLabel ?? fallback;

  const capsuleRoutes = CAPSULE_TABS.map((tab) => ({
    tab,
    route: state.routes.find((r) => r.name === tab.name),
  })).filter(
    (entry): entry is { tab: (typeof CAPSULE_TABS)[number]; route: TabRoute } => entry.route !== undefined,
  );

  const searchRoute = state.routes.find((r) => r.name === SEARCH_ROUTE_NAME);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: CUSTOMER_TAB_BAR_HORIZONTAL_MARGIN,
        right: CUSTOMER_TAB_BAR_HORIZONTAL_MARGIN,
        bottom: insets.bottom + CUSTOMER_TAB_BAR_BOTTOM_GAP,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* The shadow lives on this plain outer View, not on GlassSurface
          itself: GlassSurface clips its own blur/background layers with
          overflow:'hidden', which on iOS also clips any shadow set on that
          same view down to nothing (see oceanTabBar.tsx's identical note). */}
      <View
        style={{
          flex: 1,
          height: CUSTOMER_TAB_BAR_HEIGHT,
          borderRadius: CUSTOMER_TAB_BAR_HEIGHT / 2,
          ...theme.elevation.raised,
        }}
      >
        <GlassSurface
          tone="default"
          style={{ flex: 1, borderRadius: CUSTOMER_TAB_BAR_HEIGHT / 2, flexDirection: 'row' }}
        >
          {capsuleRoutes.map(({ tab, route }) => {
            const isFocused = route.key === focusedKey;
            const color = isFocused ? theme.colors.lagoonPrimary : theme.colors.textSecondary;
            return (
              <Pressable
                key={route.key}
                onPress={() => goTo(route)}
                onLongPress={() => longPress(route)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={accessibilityLabelFor(route.key, tab.label)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: 6,
                    borderRadius: theme.radii.full,
                    backgroundColor: isFocused ? theme.colors.tabActivePill : 'transparent',
                  }}
                >
                  <Ionicons
                    name={isFocused ? tab.filled : tab.outline}
                    size={CAPSULE_ICON_SIZE}
                    color={color}
                  />
                  <Text
                    numberOfLines={1}
                    style={{ color, fontSize: 11, fontWeight: isFocused ? '700' : '600' }}
                  >
                    {tab.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </GlassSurface>
      </View>

      {searchRoute ? (
        <>
          <View style={{ width: CUSTOMER_TAB_BAR_ITEM_GAP }} />
          <View
            style={{
              width: CUSTOMER_TAB_BAR_HEIGHT,
              height: CUSTOMER_TAB_BAR_HEIGHT,
              borderRadius: CUSTOMER_TAB_BAR_HEIGHT / 2,
              ...theme.elevation.raised,
            }}
          >
            <GlassSurface
              tone="default"
              style={{
                width: CUSTOMER_TAB_BAR_HEIGHT,
                height: CUSTOMER_TAB_BAR_HEIGHT,
                borderRadius: CUSTOMER_TAB_BAR_HEIGHT / 2,
              }}
            >
              <Pressable
                onPress={() => goTo(searchRoute)}
                onLongPress={() => longPress(searchRoute)}
                accessibilityRole="tab"
                accessibilityState={{ selected: searchRoute.key === focusedKey }}
                accessibilityLabel={accessibilityLabelFor(searchRoute.key, 'Search')}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons
                  name={searchRoute.key === focusedKey ? SEARCH_ICON.filled : SEARCH_ICON.outline}
                  size={SEARCH_ICON_SIZE}
                  color={
                    searchRoute.key === focusedKey ? theme.colors.lagoonPrimary : theme.colors.textSecondary
                  }
                />
              </Pressable>
            </GlassSurface>
          </View>
        </>
      ) : null}
    </View>
  );
}
