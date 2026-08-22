import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { Screen } from '../../../src/components/Screen';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { useAuth } from '../../../src/features/auth/AuthProvider';
import { useExperienceIntent } from '../../../src/features/auth/experience-intent';
import { InlineAuthGate } from '../../../src/features/auth/InlineAuthGate';
import { signOut } from '../../../src/features/auth/session';

export default function CustomerProfile() {
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

  if (session === undefined) {
    return <LoadingState label="Loading…" />;
  }

  if (session === null) {
    return (
      <Screen title="Profile" scroll>
        <InlineAuthGate
          title="Sign in"
          description="Sign in to manage your profile and see your booking history."
        />
      </Screen>
    );
  }

  return (
    <Screen title="Profile" description="Documents and profile management land in later phases.">
      <View style={{ gap: 12 }}>
        <Link href="/notifications" asChild>
          <Button testID="customer-link-notifications" label="Notifications" variant="secondary" />
        </Link>
        <Button
          testID="customer-sign-out"
          label="Sign out"
          variant="secondary"
          onPress={handleSignOut}
          loading={isSigningOut}
        />
      </View>
    </Screen>
  );
}
