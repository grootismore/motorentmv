import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { minTouchTarget } from '../design-system/tokens';
import { useTheme } from '../design-system/ThemeProvider';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  errorMessage?: string;
  testID?: string;
}

/** Flat Ocean Glass input: a translucent field, a thin border that turns
 * lagoon-teal on focus and destructive-red on error, never a raised or
 * embossed frame. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, errorMessage, testID, onFocus, onBlur, editable, ...inputProps },
  ref,
) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const isDisabled = editable === false;

  const borderColor = errorMessage
    ? theme.colors.destructive
    : isFocused
      ? theme.colors.lagoonPrimary
      : theme.colors.glassBorder;

  return (
    <View testID={testID ? `${testID}-container` : undefined}>
      <Text
        style={[
          theme.typography.variant.label,
          { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
        ]}
        nativeID={testID ? `${testID}-label` : undefined}
      >
        {label}
      </Text>
      <TextInput
        ref={ref}
        testID={testID}
        accessibilityLabel={label}
        accessibilityLabelledBy={testID ? `${testID}-label` : undefined}
        accessibilityState={{ disabled: isDisabled }}
        placeholderTextColor={theme.colors.textTertiary}
        editable={editable}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            borderColor,
            borderWidth: isFocused || errorMessage ? 1.5 : StyleSheet.hairlineWidth,
            borderRadius: theme.radii.control,
            color: theme.colors.textPrimary,
            backgroundColor: isDisabled ? theme.colors.glassSurface : theme.colors.glassSurfaceStrong,
            opacity: isDisabled ? 0.6 : 1,
          },
        ]}
        {...inputProps}
      />
      {errorMessage ? (
        <Text
          style={[
            theme.typography.variant.caption,
            { color: theme.colors.destructive, marginTop: theme.spacing.xs },
          ]}
          accessibilityRole="alert"
          testID={testID ? `${testID}-error` : undefined}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  input: {
    minHeight: minTouchTarget,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});
