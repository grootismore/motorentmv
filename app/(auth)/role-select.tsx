import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '../../src/components/GlassSurface';
import { Body, LargeTitle, SecondaryBody } from '../../src/components/Typography';
import { minTouchTarget } from '../../src/design-system/tokens';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { useExperienceIntent } from '../../src/features/auth/experience-intent';

type Role = 'customer' | 'renter';

const OPTIONS: { role: Role; icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  {
    role: 'customer',
    icon: 'bicycle-outline',
    title: 'Rent a motorcycle',
    description: 'Search availability, request a booking and manage your rentals — no sign-in to browse.',
  },
  {
    role: 'renter',
    icon: 'storefront-outline',
    title: 'Manage a rental business',
    description: 'Run your fleet, bookings, handovers and finances from one dashboard.',
  },
];

/**
 * The first screen anyone sees — given the same bespoke, atmospheric
 * treatment as Explore (ocean-gradient hero shell, bypassing the shared
 * Screen component's plain pearl background) rather than the plain
 * two-rectangle list this replaces. `oceanForeground`, not `textInverse`,
 * for the same reason as Explore's hero: the gradient never lightens with
 * scheme, so a scheme-adaptive token flips to near-black in dark mode.
 */
export default function RoleSelect() {
  const theme = useTheme();
  const router = useRouter();
  const { setIntent } = useExperienceIntent();

  return (
    <LinearGradient colors={[theme.colors.oceanBackground, theme.colors.oceanDeep]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, padding: 20, justifyContent: 'center', gap: theme.spacing.xxl }}>
          <View style={{ gap: theme.spacing.xs }}>
            <LargeTitle color={theme.colors.oceanForeground}>MotoRent MV</LargeTitle>
            <SecondaryBody color="rgba(244,249,252,0.75)">
              Choose how you&apos;ll use the app. You can add the other role later.
            </SecondaryBody>
          </View>

          <View style={{ gap: theme.spacing.md }}>
            {OPTIONS.map((option) => (
              <Pressable
                key={option.role}
                testID={`role-select-${option.role}`}
                onPress={() => {
                  setIntent(option.role);
                  // Renter onboarding has no anonymous mode — sign in
                  // right away. A customer, though, browses anonymously
                  // from here (PRD Prompt 5): setting intent alone flips
                  // useAppGate to 'customer' and mounts that route group;
                  // there's nothing to navigate to, sign-in only happens
                  // later, inline, when they actually submit a booking
                  // request.
                  if (option.role === 'renter') {
                    router.push({ pathname: '/sign-in', params: { role: option.role } });
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={option.title}
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
              >
                <GlassSurface tone="strong" style={{ padding: theme.spacing.lg }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: theme.radii.full,
                        backgroundColor: theme.colors.lagoonPrimary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={option.icon} size={22} color={theme.colors.textInverse} />
                    </View>
                    <View style={{ flex: 1, gap: theme.spacing.xs }}>
                      <Body style={{ fontWeight: '700' }}>{option.title}</Body>
                      <SecondaryBody>{option.description}</SecondaryBody>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
                  </View>
                </GlassSurface>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: minTouchTarget,
  },
});
