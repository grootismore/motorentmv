import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '../../../../src/components/Button';
import { GroupedSection } from '../../../../src/components/GroupedSection';
import { Screen } from '../../../../src/components/Screen';
import { ErrorState } from '../../../../src/components/states/ErrorState';
import { LoadingState } from '../../../../src/components/states/LoadingState';
import { Caption } from '../../../../src/components/Typography';
import { TextField } from '../../../../src/components/TextField';
import { useTheme } from '../../../../src/design-system/ThemeProvider';
import { AuthPrompt } from '../../../../src/features/auth/AuthPrompt';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import { useExperienceIntent } from '../../../../src/features/auth/experience-intent';
import { signOut } from '../../../../src/features/auth/session';
import { DocumentsSection } from '../../../../src/features/documents/DocumentsSection';
import { useMyProfile, useUpdateMyProfile, type Profile } from '../../../../src/features/profile/queries';

interface ProfileDetailsFormProps {
  profile: Profile;
  onSave: (values: { fullName: string; phone: string }) => void;
  isSaving: boolean;
  saveMessage?: string;
}

/**
 * A separate component, not inline state in CustomerProfile, specifically
 * so its fullName/phone useState can seed from `profile` via a plain
 * initializer instead of a useEffect -- this only ever mounts once
 * `profile.data` already exists (see the gate below), so the initializer
 * runs exactly once with real data already in hand, no
 * fetch-then-sync-via-effect race to cover.
 */
function ProfileDetailsForm({ profile, onSave, isSaving, saveMessage }: ProfileDetailsFormProps) {
  const theme = useTheme();
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');

  return (
    <View style={{ gap: theme.spacing.md }}>
      <TextField
        testID="profile-full-name"
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
      />
      <TextField
        testID="profile-phone"
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      {saveMessage ? <Caption testID="profile-save-message">{saveMessage}</Caption> : null}
      <Button
        testID="profile-save"
        label="Save"
        onPress={() => onSave({ fullName, phone })}
        loading={isSaving}
      />
    </View>
  );
}

export default function CustomerProfile() {
  const theme = useTheme();
  const { session } = useAuth();
  const { setIntent } = useExperienceIntent();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const profile = useMyProfile(session?.user.id);
  const updateProfile = useUpdateMyProfile();
  const [saveMessage, setSaveMessage] = useState<string | undefined>();

  const handleSaveProfile = (values: { fullName: string; phone: string }) => {
    if (!session) return;
    setSaveMessage(undefined);
    updateProfile.mutate(
      { userId: session.user.id, fullName: values.fullName || null, phone: values.phone || null },
      {
        onSuccess: () => setSaveMessage('Saved.'),
        onError: (error) => setSaveMessage(error.message),
      },
    );
  };

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
      <Screen title="Profile" titleStyle="large" scroll={false}>
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
    <Screen title="Profile" titleStyle="large" description="Your details, documents and account." scroll>
      <View style={{ gap: theme.spacing.lg }}>
        <GroupedSection title="Your details">
          {profile.isError ? (
            <ErrorState message={profile.error.message} onRetry={() => profile.refetch()} />
          ) : profile.data ? (
            <ProfileDetailsForm
              profile={profile.data}
              onSave={handleSaveProfile}
              isSaving={updateProfile.isPending}
              saveMessage={saveMessage}
            />
          ) : (
            <LoadingState label="Loading…" />
          )}
        </GroupedSection>

        <DocumentsSection userId={session.user.id} />

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
      </View>
    </Screen>
  );
}
