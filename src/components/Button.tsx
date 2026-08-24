import { ActivityIndicator, StyleSheet } from 'react-native';
import { Host, Button as NativeButton, RNHostView, type ButtonVariant } from '@expo/ui';

import { minTouchTarget } from '../design-system/tokens';
import { useTheme } from '../design-system/ThemeProvider';

interface ButtonProps {
  label: string;
  /** 'danger' name kept for backward compatibility with existing call
   * sites (ActionPanel, cancel-booking, etc.) — visually it's the
   * destructive treatment. 'tertiary' is a plain-text/icon action with no
   * visible container. */
  variant?: 'primary' | 'secondary' | 'danger' | 'tertiary';
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
  /** Most buttons in this app fill the width of their container (a
   * primary CTA, a full-row form action). Set false for a button that
   * should hug its label instead (e.g. two side-by-side actions, a small
   * inline "Remove" link). */
  fullWidth?: boolean;
}

const NATIVE_VARIANT: Record<NonNullable<ButtonProps['variant']>, ButtonVariant> = {
  primary: 'filled',
  secondary: 'outlined',
  danger: 'filled',
  tertiary: 'text',
};

/**
 * A real native SwiftUI/Jetpack Compose button (@expo/ui), not a Pressable
 * drawn to look like one — see AGENTS.md's native-first rule. `disabled`
 * is passed to the native button (which won't respond to a real tap on
 * device), but that's not enough on its own: `fireEvent.press` in
 * @testing-library/react-native falls back to walking *up* the component
 * tree for a same-named `onPress` prop when the pressed host node has
 * none, so a conditionally-`undefined` `onPress` here would just have it
 * find and call the raw, unguarded `onPress` this component itself
 * received. Passing one stable `handlePress` that checks `isDisabled`
 * internally closes that gap regardless of which ancestor's props the
 * fallback lands on.
 */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  onPress,
  testID,
  fullWidth = true,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const handlePress = () => {
    if (!isDisabled) onPress?.();
  };

  const palette = {
    primary: { bg: theme.colors.lagoonPrimary, fg: theme.colors.textInverse, border: 'transparent' },
    secondary: {
      bg: theme.colors.glassSurface,
      fg: theme.colors.textPrimary,
      border: theme.colors.glassBorder,
    },
    danger: { bg: theme.colors.destructive, fg: theme.colors.textInverse, border: 'transparent' },
    tertiary: { bg: 'transparent', fg: theme.colors.lagoonPrimary, border: 'transparent' },
  }[variant];

  return (
    <Host matchContents={!fullWidth} style={fullWidth ? { width: '100%' } : undefined}>
      <NativeButton
        // `label` (not `children`) whenever there's real label text to
        // show -- the native button picks its own readable text color for
        // each variant, and keeping `label` as a plain prop (rather than
        // wrapping it in custom children) is what makes it visible to
        // fireEvent/testID-based assertions in tests, since @expo/ui only
        // forwards `label` to its native view when `children` is absent.
        label={loading ? undefined : label}
        variant={NATIVE_VARIANT[variant]}
        disabled={isDisabled}
        onPress={handlePress}
        testID={testID}
        style={{
          backgroundColor: variant !== 'tertiary' ? palette.bg : undefined,
          borderColor: variant === 'secondary' ? palette.border : undefined,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : undefined,
          borderRadius: theme.radii.control,
          opacity: isDisabled ? 0.5 : 1,
          width: fullWidth ? '100%' : undefined,
          height: minTouchTarget,
        }}
      >
        {loading ? (
          <RNHostView matchContents>
            <ActivityIndicator color={palette.fg} testID={testID ? `${testID}-loading` : undefined} />
          </RNHostView>
        ) : undefined}
      </NativeButton>
    </Host>
  );
}
