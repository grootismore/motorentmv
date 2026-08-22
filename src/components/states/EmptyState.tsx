import { View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import { Body, SectionTitle } from '../Typography';
import { Button } from '../Button';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl }}
      accessible
      accessibilityRole="text"
    >
      <SectionTitle style={{ textAlign: 'center' }}>{title}</SectionTitle>
      {message ? (
        <Body color={theme.colors.textSecondary} style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
          {message}
        </Body>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Button variant="secondary" label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
