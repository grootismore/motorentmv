import type { PropsWithChildren } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../design-system/ThemeProvider';
import { LargeTitle, NavigationTitle, SecondaryBody } from './Typography';

interface ScreenProps extends PropsWithChildren {
  title: string;
  description?: string;
  scroll?: boolean;
  /** 'large' for a primary/landing screen (Explore, Today); 'compact' (the
   * default) for a detail/form screen — matches the Ocean Glass "large
   * titles on primary screens, compact navigation titles on detail
   * screens" rule. */
  titleStyle?: 'large' | 'compact';
  /** Overrides the title/description color -- used by screens that render
   * their own ocean-gradient header above the fold (title text sits on
   * dark blue, not the pearl background). */
  headerTextColor?: string;
  /** Only meaningful when `scroll` is true: wires the screen's own
   * ScrollView to the OS's native pull-to-refresh (RefreshControl), for a
   * screen whose content is a live query rather than a FlatList/
   * SectionList (those already get it for free via their own onRefresh/
   * refreshing props). Omit both on a screen with nothing to refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * Shared shell for every screen: pearl background, safe-area handling,
 * consistent title/description. Both the customer and renter tab bars are
 * now real native tab bars (app/(customer)/(tabs)/_layout.tsx,
 * app/(renter)/(tabs)/_layout.tsx) -- each occupies its own
 * non-overlapping layout space and gets automatic scroll-content-inset
 * handling from the OS, so no screen anywhere needs manual bottom
 * clearance for a floating bar any more. The bottom padding below is
 * just ordinary scroll-end breathing room, same value as the horizontal
 * padding plus a bit more, not a tab-bar reservation.
 */
export function Screen({
  title,
  description,
  scroll = false,
  titleStyle = 'compact',
  headerTextColor,
  refreshing,
  onRefresh,
  children,
}: ScreenProps) {
  const theme = useTheme();
  const Title = titleStyle === 'large' ? LargeTitle : NavigationTitle;

  const header = (
    <>
      <Title color={headerTextColor} style={{ marginBottom: theme.spacing.xs }} accessibilityRole="header">
        {title}
      </Title>
      {description ? (
        <SecondaryBody
          color={headerTextColor ? headerTextColor : undefined}
          style={{ marginBottom: theme.spacing.lg }}
        >
          {description}
        </SecondaryBody>
      ) : null}
    </>
  );

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.pearlBackground }]}
      edges={['top', 'left', 'right']}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} /> : undefined
          }
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    padding: 20,
    // Ordinary scroll-end breathing room -- the OS's native tab bars
    // already reserve their own space, so this isn't clearing anything.
    paddingBottom: 32,
  },
});
