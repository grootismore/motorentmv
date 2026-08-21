import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '../../src/components/Screen';
import { minTouchTarget } from '../../src/design-system/tokens';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { useAppShell, type Experience } from '../../src/lib/app-shell';

/**
 * Navigable shell only — no real OTP verification yet. On "Confirm" this
 * simulates a completed sign-in by selecting the chosen experience, purely
 * so the rest of the shell (customer/renter tabs) is reachable for QA.
 */
export default function Verify() {
  const theme = useTheme();
  const router = useRouter();
  const { selectExperience } = useAppShell();
  const { role } = useLocalSearchParams<{ role?: string }>();

  const handleConfirm = () => {
    const experience: Experience = role === 'renter' ? 'renter' : 'customer';
    selectExperience(experience);
    router.replace('/');
  };

  return (
    <Screen title="Enter code" description="Placeholder OTP confirmation — no code is sent yet.">
      <Pressable
        onPress={handleConfirm}
        accessibilityRole="button"
        accessibilityLabel="Confirm"
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radii.md,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.buttonLabel, { color: theme.colors.primaryText }]}>Confirm</Text>
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
