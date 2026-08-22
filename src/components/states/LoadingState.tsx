import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import { SecondaryBody } from '../Typography';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator size="large" color={theme.colors.lagoonPrimary} />
      <SecondaryBody style={{ marginTop: theme.spacing.md }}>{label}</SecondaryBody>
    </View>
  );
}
