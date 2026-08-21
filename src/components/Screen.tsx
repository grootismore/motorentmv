import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../design-system/ThemeProvider';

interface ScreenProps extends PropsWithChildren {
  title: string;
  description?: string;
  scroll?: boolean;
}

/**
 * Shared shell for navigable-shell screens: themed background, safe-area
 * handling, consistent title/description. Business screens will replace the
 * placeholder body content but should keep using this wrapper (or its
 * conventions) for consistent spacing and accessibility.
 */
export function Screen({ title, description, scroll = false, children }: ScreenProps) {
  const theme = useTheme();
  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <Container
        style={scroll ? styles.flex : styles.body}
        contentContainerStyle={scroll ? styles.body : undefined}
      >
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.xl,
              marginBottom: theme.spacing.xs,
            },
          ]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={[
              styles.description,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.sm,
                marginBottom: theme.spacing.lg,
              },
            ]}
          >
            {description}
          </Text>
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
  },
  title: {
    fontWeight: '700',
  },
  description: {
    lineHeight: 20,
  },
});
