import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { Screen } from '../../../src/components/Screen';
import { useExperienceIntent } from '../../../src/features/auth/experience-intent';
import { signOut } from '../../../src/features/auth/session';

export default function CustomerProfile() {
  const { setIntent } = useExperienceIntent();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIntent(null);
    // No manual navigation: AuthProvider's onAuthStateChange flips
    // session to null, useAppGate recomputes to 'auth', and the root
    // Stack.Protected swap handles the rest.
  };

  return (
    <Screen title="Profile" description="Documents and profile management land in later phases.">
      <View style={{ gap: 12 }}>
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
