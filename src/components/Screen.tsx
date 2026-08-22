import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
}

/**
 * Shared shell for every screen: pearl background, safe-area handling,
 * consistent title/description. Bottom padding always reserves space for
 * the floating Ocean Glass tab bar (src/components/oceanTabBar.tsx) --
 * every (customer)/(renter) route is a Tabs.Screen (even the "hidden"
 * href:null ones), so the bar is present under all of them; the handful
 * of (auth)/(shared) screens that aren't just get a little extra
 * breathing room at the bottom, which is harmless.
 */
export function Screen({
  title,
  description,
  scroll = false,
  titleStyle = 'compact',
  headerTextColor,
  children,
}: ScreenProps) {
  const theme = useTheme();
  const Container = scroll ? ScrollView : View;
  const Title = titleStyle === 'large' ? LargeTitle : NavigationTitle;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.pearlBackground }]}
      edges={['top', 'left', 'right']}
    >
      <Container
        style={scroll ? styles.flex : styles.body}
        contentContainerStyle={scroll ? styles.body : undefined}
      >
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
        {children}
      </Container>
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
    paddingBottom: 96,
  },
});
