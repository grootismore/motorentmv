import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { requestEmailOtp } from '../../src/features/auth/session';

/**
 * PRD §6.1: email OTP (a 6-digit code — see session.ts for why not a
 * magic link). Phone OTP is deferred until an SMS provider is confirmed.
 */
export default function SignIn() {
  const theme = useTheme();
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleContinue = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Enter your email address.');
      return;
    }
    setErrorMessage(undefined);
    setIsSubmitting(true);
    const result = await requestEmailOtp(trimmed);
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    router.push({ pathname: '/verify', params: { role, email: trimmed } });
  };

  return (
    <Screen title="Sign in" description="Enter your email — we'll send you a 6-digit code.">
      <View style={{ gap: theme.spacing.lg }}>
        <TextField
          testID="sign-in-email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          errorMessage={errorMessage}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
          editable={!isSubmitting}
        />
        <Button testID="sign-in-continue" label="Send code" onPress={handleContinue} loading={isSubmitting} />
      </View>
    </Screen>
  );
}
