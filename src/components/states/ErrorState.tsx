import { Pressable, StyleSheet, Text, View } from 'react-native';

import { minTouchTarget } from '../../design-system/tokens';
import { useTheme } from '../../design-system/ThemeProvider';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/**
 * Status is conveyed by the "⚠" glyph + text label together, never color
 * alone (PRD §11 accessibility NFR).
 */
export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} accessible accessibilityRole="alert">
      <Text
        style={[styles.glyph, { color: theme.colors.danger }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        ⚠
      </Text>
      <Text style={[styles.title, { color: theme.colors.textPrimary, marginTop: theme.spacing.sm }]}>
        {title}
      </Text>
      {message ? (
        <Text style={[styles.message, { color: theme.colors.textSecondary, marginTop: theme.spacing.xs }]}>
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={({ pressed }) => [
            styles.action,
            {
              borderColor: theme.colors.primary,
              borderRadius: theme.radii.md,
              marginTop: theme.spacing.lg,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glyph: {
    fontSize: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
  },
  action: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
