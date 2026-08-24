import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import { Body, SectionTitle } from '../Typography';
import { Button } from '../Button';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional compact icon shown above the title — omit for a plain
   * text-only empty state. */
  icon?: keyof typeof Ionicons.glyphMap;
}

export function EmptyState({ title, message, actionLabel, onAction, icon }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl }}
      accessible
      accessibilityRole="text"
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={28}
          color={theme.colors.textTertiary}
          style={{ marginBottom: theme.spacing.sm }}
        />
      ) : null}
      <SectionTitle style={{ textAlign: 'center' }}>{title}</SectionTitle>
      {message ? (
        <Body color={theme.colors.textSecondary} style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
          {message}
        </Body>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Button testID="empty-state-action" variant="secondary" label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
