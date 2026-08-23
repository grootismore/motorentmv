import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { GlassSurface } from '../../../../src/components/GlassSurface';
import { Screen } from '../../../../src/components/Screen';
import { Body, Caption } from '../../../../src/components/Typography';
import { minTouchTarget } from '../../../../src/design-system/tokens';
import { useTheme } from '../../../../src/design-system/ThemeProvider';
import { signOut } from '../../../../src/features/auth/session';

const LINKS: { href: '/more/staff' | '/notifications'; label: string; testID: string }[] = [
  { href: '/more/staff', label: 'Staff', testID: 'more-link-staff' },
  { href: '/notifications', label: 'Notifications', testID: 'more-link-notifications' },
];

export default function More() {
  const theme = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const confirmSignOut = () => {
    Alert.alert('Sign out?', "You'll need to sign in again to manage this business.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          await signOut();
        },
      },
    ]);
  };

  return (
    <Screen title="More" titleStyle="large" description="Customers, finances, reports, staff and settings.">
      <View style={{ gap: theme.spacing.sm }}>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} asChild>
            <Pressable
              testID={link.testID}
              accessibilityRole="button"
              accessibilityLabel={link.label}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <GlassSurface
                style={{
                  minHeight: minTouchTarget,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: theme.spacing.lg,
                }}
              >
                <Body style={{ fontWeight: '600' }}>{link.label}</Body>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
              </GlassSurface>
            </Pressable>
          </Link>
        ))}

        <Caption style={{ marginTop: theme.spacing.md }}>
          Customers, finances and reports arrive in later phases.
        </Caption>

        <Pressable
          testID="more-sign-out"
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          disabled={isSigningOut}
          onPress={confirmSignOut}
          style={({ pressed }) => ({ marginTop: theme.spacing.lg, opacity: pressed ? 0.85 : 1 })}
        >
          <GlassSurface
            style={{
              minHeight: minTouchTarget,
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.lg,
            }}
          >
            <Body style={{ fontWeight: '600', color: theme.colors.destructive }}>Sign out</Body>
          </GlassSurface>
        </Pressable>
      </View>
    </Screen>
  );
}
