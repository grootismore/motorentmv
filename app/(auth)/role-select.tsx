import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../src/components/Screen';
import { minTouchTarget } from '../../src/design-system/tokens';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { useExperienceIntent } from '../../src/features/auth/experience-intent';

type Role = 'customer' | 'renter';

const OPTIONS: { role: Role; title: string; description: string }[] = [
  {
    role: 'customer',
    title: 'Rent a motorcycle',
    description: 'Search availability, request a booking and manage your rentals.',
  },
  {
    role: 'renter',
    title: 'Manage a rental business',
    description: 'Run your fleet, bookings, handovers and finances.',
  },
];

export default function RoleSelect() {
  const theme = useTheme();
  const router = useRouter();
  const { setIntent } = useExperienceIntent();

  return (
    <Screen
      title="MotoRent MV"
      description="Choose how you'll use the app. You can add the other role later."
    >
      <View style={{ gap: theme.spacing.md }}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.role}
            testID={`role-select-${option.role}`}
            onPress={() => {
              setIntent(option.role);
              // Renter onboarding has no anonymous mode — sign in right
              // away. A customer, though, browses anonymously from here
              // (PRD Prompt 5): setting intent alone flips useAppGate to
              // 'customer' and mounts that route group; there's nothing
              // to navigate to, sign-in only happens later, inline, when
              // they actually submit a booking request.
              if (option.role === 'renter') {
                router.push({ pathname: '/sign-in', params: { role: option.role } });
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={option.title}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
                padding: theme.spacing.lg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: theme.colors.textPrimary, fontSize: theme.typography.size.lg },
              ]}
            >
              {option.title}
            </Text>
            <Text
              style={[
                styles.cardDescription,
                {
                  color: theme.colors.textSecondary,
                  marginTop: theme.spacing.xs,
                  fontSize: theme.typography.size.sm,
                },
              ]}
            >
              {option.description}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    minHeight: minTouchTarget,
  },
  cardTitle: {
    fontWeight: '700',
  },
  cardDescription: {
    lineHeight: 20,
  },
});
