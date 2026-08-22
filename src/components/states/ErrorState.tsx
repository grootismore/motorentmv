import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import { Body, SectionTitle } from '../Typography';
import { Button } from '../Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/**
 * Status is conveyed by the icon + text label together, never color alone
 * (PRD §11 accessibility NFR).
 */
export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl }}
      accessible
      accessibilityRole="alert"
    >
      <Ionicons
        name="alert-circle-outline"
        size={32}
        color={theme.colors.destructive}
        accessibilityElementsHidden
      />
      <SectionTitle style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>{title}</SectionTitle>
      {message ? (
        <Body color={theme.colors.textSecondary} style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
          {message}
        </Body>
      ) : null}
      {onRetry ? (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Button variant="secondary" label="Try again" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
