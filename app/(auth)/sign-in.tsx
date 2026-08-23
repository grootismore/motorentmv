import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { SecondaryBody } from '../../src/components/Typography';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { useExperienceIntent, type ExperienceIntent } from '../../src/features/auth/experience-intent';
import { signInWithPassword, signUpWithPassword } from '../../src/features/auth/session';

type Mode = 'sign_in' | 'sign_up';

const MIN_PASSWORD_LENGTH = 6;

export default function SignIn() {
  const theme = useTheme();
  const { setIntent } = useExperienceIntent();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [infoMessage, setInfoMessage] = useState<string | undefined>();

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    setErrorMessage(undefined);
    setInfoMessage(undefined);

    if (!trimmedEmail) {
      setErrorMessage('Enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Enter your password.');
      return;
    }
    if (mode === 'sign_up') {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    if (mode === 'sign_up') {
      const result = await signUpWithPassword(trimmedEmail, password);
      setIsSubmitting(false);
      if (!result.ok) {
        setErrorMessage(result.error.message);
        return;
      }
      if (result.data.needsEmailConfirmation) {
        setMode('sign_in');
        setPassword('');
        setConfirmPassword('');
        setInfoMessage('Account created — check your email to confirm it, then sign in below.');
        return;
      }
      // AuthProvider's onAuthStateChange picks up the new session and
      // useAppGate re-derives the route automatically — this screen
      // doesn't navigate itself. Setting intent here is what lets a
      // signed-in renter-with-no-org-yet land on onboarding instead of the
      // customer shell (see useAppGate.ts).
      setIntent((role === 'renter' ? 'renter' : 'customer') satisfies ExperienceIntent);
      return;
    }

    const result = await signInWithPassword(trimmedEmail, password);
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    setIntent((role === 'renter' ? 'renter' : 'customer') satisfies ExperienceIntent);
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'sign_in' ? 'sign_up' : 'sign_in'));
    setErrorMessage(undefined);
    setInfoMessage(undefined);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <Screen
      title={mode === 'sign_in' ? 'Sign in' : 'Create account'}
      description={
        mode === 'sign_in' ? 'Enter your email and password.' : 'Set a password for your new account.'
      }
    >
      <View style={{ gap: theme.spacing.lg }}>
        <TextField
          testID="sign-in-email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
          editable={!isSubmitting}
        />
        <TextField
          testID="sign-in-password"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === 'sign_up' ? 'new-password' : 'password'}
          textContentType={mode === 'sign_up' ? 'newPassword' : 'password'}
          placeholder="••••••••"
          editable={!isSubmitting}
        />
        {mode === 'sign_up' ? (
          <TextField
            testID="sign-in-confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="••••••••"
            editable={!isSubmitting}
          />
        ) : null}
        {errorMessage ? (
          <SecondaryBody testID="sign-in-error" accessibilityRole="alert" color={theme.colors.destructive}>
            {errorMessage}
          </SecondaryBody>
        ) : null}
        {infoMessage ? (
          <SecondaryBody testID="sign-in-info" accessibilityRole="alert">
            {infoMessage}
          </SecondaryBody>
        ) : null}
        <Button
          testID="sign-in-continue"
          label={mode === 'sign_in' ? 'Sign in' : 'Create account'}
          onPress={() => {
            void handleSubmit();
          }}
          loading={isSubmitting}
        />
        <Button
          testID="sign-in-toggle-mode"
          label={
            mode === 'sign_in' ? "Don't have an account? Create one" : 'Already have an account? Sign in'
          }
          variant="tertiary"
          onPress={toggleMode}
        />
      </View>
    </Screen>
  );
}
