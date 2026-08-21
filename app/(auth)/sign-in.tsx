import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '../../src/components/Screen';
import { minTouchTarget } from '../../src/design-system/tokens';
import { useTheme } from '../../src/design-system/ThemeProvider';

/**
 * Navigable shell only — no real magic-link/OTP request yet. That lands with
 * Supabase Auth in Phase 1 (Prompt 3).
 */
export default function SignIn() {
  const theme = useTheme();
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();

  return (
    <Screen
      title="Sign in"
      description="Email magic link or OTP, or phone OTP where available. Not yet wired to a backend."
    >
      <Pressable
        onPress={() => router.push({ pathname: '/verify', params: { role } })}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radii.md,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.buttonLabel, { color: theme.colors.primaryText }]}>Continue</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
