import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type TextInputProps as RNTextInputProps } from 'react-native';
import {
  Host,
  TextInput as NativeTextInput,
  useNativeState,
  type TextInputProps as NativeTextInputProps,
} from '@expo/ui';

import { minTouchTarget } from '../design-system/tokens';
import { useTheme } from '../design-system/ThemeProvider';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  errorMessage?: string;
  testID?: string;
  editable?: boolean;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: NativeTextInputProps['keyboardType'];
  /** Same RN autoComplete vocabulary as before ('email', 'tel', 'name',
   * 'new-password', ...) — @expo/ui derives the correct iOS textContentType
   * from this one value internally, so there's no separate textContentType
   * prop to pass any more. */
  autoComplete?: RNTextInputProps['autoComplete'];
  autoCapitalize?: NativeTextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
}

/**
 * A real native SwiftUI/Jetpack Compose text field (@expo/ui), not an RN
 * TextInput drawn to look native. @expo/ui's TextInput holds its value as
 * an observable (`useNativeState`) rather than a plain controlled string,
 * so this bridges our existing plain `value`/`onChangeText` API onto that:
 * typing writes both the observable (so the native field visually
 * updates) and calls the caller's `onChangeText` (so the rest of the app
 * keeps working exactly as before); the effect below is what makes an
 * *external* reset (e.g. a form clearing itself after a successful
 * submit) show up in the field too.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  errorMessage,
  testID,
  editable,
  multiline,
  secureTextEntry,
  keyboardType,
  autoComplete,
  autoCapitalize,
  autoCorrect,
}: TextFieldProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const isDisabled = editable === false;
  const nativeValue = useNativeState(value);

  useEffect(() => {
    // @expo/ui's ObservableState is intentionally mutable -- writing
    // `.value` is its documented API for driving the native field from
    // JS, not an immutability violation the lint rule can tell apart
    // from one.
    // eslint-disable-next-line react-hooks/immutability
    if (nativeValue.value !== value) nativeValue.value = value;
    // nativeValue is a stable identity from useNativeState (a ref under
    // the hood, per jest.setup.ts's mock and useNativeState's own real
    // implementation); only the incoming `value` prop should re-trigger
    // this sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
      >
        {label}
      </Text>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <NativeTextInput
          value={nativeValue}
          onChangeText={(text) => {
            // eslint-disable-next-line react-hooks/immutability -- see the effect above
            nativeValue.value = text;
            onChangeText(text);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          editable={editable}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          testID={testID}
          textStyle={{ color: theme.colors.textPrimary, fontSize: 16 }}
          style={{
            height: minTouchTarget,
            paddingHorizontal: 12,
            borderColor,
            borderWidth: isFocused || errorMessage ? 1.5 : StyleSheet.hairlineWidth,
            borderRadius: theme.radii.control,
            backgroundColor: isDisabled ? theme.colors.glassSurface : theme.colors.glassSurfaceStrong,
            opacity: isDisabled ? 0.6 : 1,
          }}
        />
      </Host>
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
}
