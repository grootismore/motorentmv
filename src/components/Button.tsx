import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { minTouchTarget } from '../design-system/tokens';
import { useTheme } from '../design-system/ThemeProvider';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  testID?: string;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  testID,
  ...pressableProps
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: { bg: theme.colors.primary, fg: theme.colors.primaryText, border: theme.colors.primary },
    secondary: { bg: theme.colors.surface, fg: theme.colors.textPrimary, border: theme.colors.border },
    danger: { bg: theme.colors.danger, fg: theme.colors.textInverse, border: theme.colors.danger },
  }[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: theme.radii.md,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
