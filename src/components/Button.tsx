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
 * border, no convex highlight, no glow — pressed states are conveyed by
 * color and opacity only, never a shadow or bevel.
 *
 * Disabled/loading is its own flat `theme.colors.disabled` fill with
 * `textSecondary` content, not the variant's normal colors faded by a
 * blanket `opacity: 0.5` — that used to be genuinely illegible for
 * `primary`/`danger` in dark mode specifically: near-black text
 * (`textInverse`) on a bright teal/red fill, both faded 50% over an
 * already-dark page background, blend toward the *same* dark color
 * instead of toward two visibly different ones. `disabled`/`textSecondary`
 * are dedicated tokens for exactly this (muted but still legible on their
 * own), not fades of the enabled-state colors.
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
  const hasContainer = variant !== 'tertiary';

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

  const foreground = isDisabled && hasContainer ? theme.colors.textSecondary : palette.fg;

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
          backgroundColor:
            isDisabled && hasContainer
              ? theme.colors.disabled
              : pressed && !isDisabled
                ? palette.bgPressed
                : palette.bg,
          borderColor: isDisabled && hasContainer ? 'transparent' : palette.border,
          borderRadius: theme.radii.control,
          opacity: !hasContainer && isDisabled ? 0.5 : pressed && variant === 'tertiary' ? 0.6 : 1,
          // Tactile press feedback -- 0.96 is the floor; anything smaller
          // reads as exaggerated. Driven directly by Pressable's `pressed`
          // state (not Animated), so it's inherently interruptible and
          // snaps back instantly on release, no timing/easing needed.
          transform: [{ scale: pressed && !isDisabled ? 0.96 : 1 }],
        },
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <ButtonLabel color={foreground}>{label}</ButtonLabel>
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
