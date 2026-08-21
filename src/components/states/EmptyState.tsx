import { Pressable, StyleSheet, Text, View } from 'react-native';

import { minTouchTarget } from '../../design-system/tokens';
import { useTheme } from '../../design-system/ThemeProvider';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} accessible accessibilityRole="text">
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: theme.colors.textSecondary, marginTop: theme.spacing.xs }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.md,
              marginTop: theme.spacing.lg,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.actionLabel, { color: theme.colors.primaryText }]}>{actionLabel}</Text>
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
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
