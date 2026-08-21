import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { minTouchTarget } from '../design-system/tokens';
import { useTheme } from '../design-system/ThemeProvider';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  errorMessage?: string;
  testID?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, errorMessage, testID, ...inputProps },
  ref,
) {
  const theme = useTheme();

  return (
    <View testID={testID ? `${testID}-container` : undefined}>
      <Text
        style={[styles.label, { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }]}
        nativeID={testID ? `${testID}-label` : undefined}
      >
        {label}
      </Text>
      <TextInput
        ref={ref}
        testID={testID}
        accessibilityLabel={label}
        accessibilityLabelledBy={testID ? `${testID}-label` : undefined}
        placeholderTextColor={theme.colors.textSecondary}
        style={[
          styles.input,
          {
            borderColor: errorMessage ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radii.md,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
          },
        ]}
        {...inputProps}
      />
      {errorMessage ? (
        <Text
          style={[styles.error, { color: theme.colors.danger, marginTop: theme.spacing.xs }]}
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
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
  },
});
