import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '../../../../src/components/Button';
import { GroupedSection } from '../../../../src/components/GroupedSection';
import { Screen } from '../../../../src/components/Screen';
import { LoadingState } from '../../../../src/components/states/LoadingState';
import { useTheme } from '../../../../src/design-system/ThemeProvider';
import { AuthPrompt } from '../../../../src/features/auth/AuthPrompt';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import { useExperienceIntent } from '../../../../src/features/auth/experience-intent';
import { signOut } from '../../../../src/features/auth/session';

export default function CustomerProfile() {
  const theme = useTheme();
  const { session } = useAuth();
  const { setIntent } = useExperienceIntent();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIntent(null);
    // No manual navigation: AuthProvider's onAuthStateChange flips
    // session to null, but with intent also cleared here the gate lands
    // back on role-select — a browsing customer's next visit starts from
    // the same choice they made this time, not silently re-entering
    // anonymous customer mode.
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', "You'll need to sign in again to see your bookings.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: handleSignOut },
    ]);
  };

  if (session === undefined) {
    return <LoadingState label="Loading…" />;
  }

  if (session === null) {
    return (
      <Screen title="Profile" titleStyle="large" scroll>
        <AuthPrompt
          testID="profile-auth-prompt"
          icon="person-circle-outline"
          heading="Sign in to manage your profile"
          message="Your details, documents and booking history live here once you're signed in."
          gateTitle="Sign in"
          gateDescription="Sign in to manage your profile and see your booking history."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Profile"
      titleStyle="large"
      description="Documents and profile management land in later phases."
    >
      <GroupedSection>
        <View style={{ gap: theme.spacing.md }}>
          <Link href="/notifications" asChild>
            <Button testID="customer-link-notifications" label="Notifications" variant="secondary" />
          </Link>
          <Button
            testID="customer-sign-out"
            label="Sign out"
            variant="secondary"
            onPress={confirmSignOut}
            loading={isSigningOut}
          />
        </View>
      </GroupedSection>
    </Screen>
  );
}
