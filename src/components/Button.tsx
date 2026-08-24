import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { minTouchTarget } from '../design-system/tokens';
import { useTheme } from '../design-system/ThemeProvider';
import { ButtonLabel } from './Typography';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  /** 'danger' name kept for backward compatibility with existing call
   * sites (ActionPanel, cancel-booking, etc.) — visually it's the Ocean
   * Glass "destructive" treatment. 'tertiary' is new: a plain-text/icon
   * action with a generous touch target and no visible container. */
  variant?: 'primary' | 'secondary' | 'danger' | 'tertiary';
  loading?: boolean;
  testID?: string;
}

/**
 * Ocean Glass button treatment: flat rounded rectangles, no embossed
 * border, no convex highlight, no glow — pressed/disabled/loading states
 * are conveyed by color and opacity only, never a shadow or bevel.
 */
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
    primary: {
      bg: theme.colors.lagoonPrimary,
      bgPressed: theme.colors.lagoonPressed,
      fg: theme.colors.textInverse,
      border: 'transparent',
    },
    secondary: {
      bg: theme.colors.glassSurface,
      bgPressed: theme.colors.glassSurfaceStrong,
      fg: theme.colors.textPrimary,
      border: theme.colors.glassBorder,
    },
    danger: {
      bg: theme.colors.destructive,
      bgPressed: theme.colors.destructive,
      fg: theme.colors.textInverse,
      border: 'transparent',
    },
    tertiary: {
      bg: 'transparent',
      bgPressed: 'transparent',
      fg: theme.colors.lagoonPrimary,
      border: 'transparent',
    },
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
        variant === 'tertiary' ? styles.tertiaryButton : styles.containedButton,
        {
          backgroundColor: pressed && !isDisabled ? palette.bgPressed : palette.bg,
          borderColor: palette.border,
          borderRadius: theme.radii.control,
          opacity: isDisabled ? 0.5 : pressed && variant === 'tertiary' ? 0.6 : 1,
        },
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <ButtonLabel color={palette.fg}>{label}</ButtonLabel>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containedButton: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
  },
  tertiaryButton: {
    borderWidth: 0,
    paddingHorizontal: 12,
  },
});
