import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { LargeTitle, SecondaryBody } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { signInWithPassword, signUpWithPassword } from './session';

type Mode = 'sign_in' | 'sign_up';

const MIN_PASSWORD_LENGTH = 6;

interface InlineAuthGateProps {
  title?: string;
  description?: string;
}

/**
 * The customer "authentication gate" (PRD Prompt 5): search, listing
 * detail and the quote are anonymous, but submitting a request needs a
 * real customer_id — this is that gate, rendered inline in the checkout
 * flow (and in My Bookings' signed-out state) rather than as a separate
 * route. It never navigates: on success, AuthProvider's
 * onAuthStateChange updates `session` and the parent screen re-renders
 * past this component on its own — see useAuth() in the calling screen.
 * Unlike (auth)/sign-in.tsx, this never touches experience-intent: intent
 * is already 'customer' by construction (nothing renders this from any
 * other context), and there's no post-auth route decision to make here.
 */
export function InlineAuthGate({
  title = 'Sign in to continue',
  description = 'Enter your email and password.',
}: InlineAuthGateProps) {
  const theme = useTheme();
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
      }
      // Otherwise the sign-up already returned a session -- see the
      // component doc above for what happens next.
      return;
    }

    const result = await signInWithPassword(trimmedEmail, password);
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
    }
    // On success, nothing else to do here — see the component doc above.
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'sign_in' ? 'sign_up' : 'sign_in'));
    setErrorMessage(undefined);
    setInfoMessage(undefined);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <View style={{ gap: theme.spacing.lg }} testID="inline-auth-gate">
      <View style={{ gap: theme.spacing.xs }}>
        <LargeTitle style={{ fontSize: 22, lineHeight: 28 }}>
          {mode === 'sign_in' ? title : 'Create account'}
        </LargeTitle>
        <SecondaryBody>{description}</SecondaryBody>
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <TextField
          testID="inline-auth-email"
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
          testID="inline-auth-password"
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
            testID="inline-auth-confirm-password"
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
          <SecondaryBody
            testID="inline-auth-error"
            accessibilityRole="alert"
            color={theme.colors.destructive}
          >
            {errorMessage}
          </SecondaryBody>
        ) : null}
        {infoMessage ? (
          <SecondaryBody testID="inline-auth-info" accessibilityRole="alert">
            {infoMessage}
          </SecondaryBody>
        ) : null}
        <Button
          testID="inline-auth-submit"
          label={mode === 'sign_in' ? 'Sign in' : 'Create account'}
          onPress={() => {
            void handleSubmit();
          }}
          loading={isSubmitting}
        />
        <Button
          testID="inline-auth-toggle-mode"
          label={
            mode === 'sign_in' ? "Don't have an account? Create one" : 'Already have an account? Sign in'
          }
          variant="tertiary"
          onPress={toggleMode}
        />
      </View>
    </View>
  );
}
