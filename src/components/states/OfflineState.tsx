import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import { Body, SectionTitle } from '../Typography';

interface OfflineStateProps {
  message?: string;
}

/** Distinct from ErrorState: this isn't "something went wrong," it's "the
 * device has no connection right now" -- shown only when NetInfo reports
 * isConnected === false, not on an ordinary query error (a real backend
 * error while online still goes through ErrorState). */
export function OfflineState({
  message = 'Showing your last-loaded data. Reconnect to refresh.',
}: OfflineStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{ alignItems: 'center', padding: theme.spacing.lg }}
      accessible
      accessibilityRole="alert"
      testID="dashboard-offline-banner"
    >
      <Ionicons
        name="cloud-offline-outline"
        size={28}
        color={theme.colors.textTertiary}
        accessibilityElementsHidden
      />
      <SectionTitle style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
        You&apos;re offline
      </SectionTitle>
      <Body color={theme.colors.textSecondary} style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
        {message}
      </Body>
    </View>
  );
}
