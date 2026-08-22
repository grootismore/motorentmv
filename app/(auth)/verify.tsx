import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { SecondaryBody } from '../../src/components/Typography';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { useExperienceIntent, type ExperienceIntent } from '../../src/features/auth/experience-intent';
import { requestEmailOtp, verifyEmailOtp } from '../../src/features/auth/session';

export default function Verify() {
  const theme = useTheme();
  const { setIntent } = useExperienceIntent();
  const { role, email } = useLocalSearchParams<{ role?: string; email?: string }>();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [resendMessage, setResendMessage] = useState<string | undefined>();

  const handleConfirm = async () => {
    if (!email) {
      setErrorMessage('Missing email — go back and try again.');
      return;
    }
    if (!code.trim()) {
      setErrorMessage('Enter the 6-digit code from your email.');
      return;
    }
    setErrorMessage(undefined);
    setIsSubmitting(true);
    const result = await verifyEmailOtp(email, code.trim());
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    // AuthProvider's onAuthStateChange picks up the new session and
    // useAppGate re-derives the route automatically — this screen doesn't
    // navigate itself. Setting intent here is what lets a signed-in
    // renter-with-no-org-yet land on onboarding instead of the customer
    // shell (see useAppGate.ts).
    setIntent((role === 'renter' ? 'renter' : 'customer') satisfies ExperienceIntent);
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setResendMessage(undefined);
    const result = await requestEmailOtp(email);
    setIsResending(false);
    setResendMessage(result.ok ? 'Code resent.' : result.error.message);
  };

  return (
    <Screen title="Enter code" description={email ? `We sent a code to ${email}.` : 'Enter your code.'}>
      <View style={{ gap: theme.spacing.lg }}>
        <TextField
          testID="verify-code"
          label="6-digit code"
          value={code}
          onChangeText={setCode}
          errorMessage={errorMessage}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          placeholder="123456"
          editable={!isSubmitting}
        />
        <Button testID="verify-confirm" label="Confirm" onPress={handleConfirm} loading={isSubmitting} />
        <Button
          testID="verify-resend"
          label="Resend code"
          variant="secondary"
          onPress={handleResend}
          loading={isResending}
        />
        {resendMessage ? (
          <SecondaryBody testID="verify-resend-message" accessibilityRole="alert">
            {resendMessage}
          </SecondaryBody>
        ) : null}
      </View>
    </Screen>
  );
}
