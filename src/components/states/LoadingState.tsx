import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
        {label}
      </Text>
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
  label: {
    fontSize: 14,
  },
});
