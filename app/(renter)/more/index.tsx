import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../src/components/Screen';
import { minTouchTarget } from '../../../src/design-system/tokens';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { signOut } from '../../../src/features/auth/session';

const LINKS: { href: '/more/staff' | '/notifications'; label: string; testID: string }[] = [
  { href: '/more/staff', label: 'Staff', testID: 'more-link-staff' },
  { href: '/notifications', label: 'Notifications', testID: 'more-link-notifications' },
];

export default function More() {
  const theme = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Screen title="More" description="Customers, finances, reports, staff and settings.">
      <View style={{ gap: theme.spacing.sm }}>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} asChild>
            <Pressable
              testID={link.testID}
              accessibilityRole="button"
              accessibilityLabel={link.label}
              style={({ pressed }) => [
                styles.row,
                {
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>{link.label}</Text>
            </Pressable>
          </Link>
        ))}

        <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.md }}>
          Customers, finances and reports arrive in later phases.
        </Text>

        <Pressable
          testID="more-sign-out"
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          disabled={isSigningOut}
          onPress={async () => {
            setIsSigningOut(true);
            await signOut();
          }}
          style={({ pressed }) => [
            styles.row,
            {
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              marginTop: theme.spacing.lg,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>Sign out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
  },
});
