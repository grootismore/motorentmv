import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { LargeTitle, SecondaryBody } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { requestEmailOtp, verifyEmailOtp } from './session';

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
 * Unlike (auth)/verify.tsx, this never touches experience-intent: intent
 * is already 'customer' by construction (nothing renders this from any
 * other context), and there's no post-auth route decision to make here.
 */
export function InlineAuthGate({
  title = 'Sign in to continue',
  description = "Enter your email — we'll send you a 6-digit code.",
}: InlineAuthGateProps) {
  const theme = useTheme();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [resendMessage, setResendMessage] = useState<string | undefined>();

  const handleSendCode = async () => {
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
    setStep('code');
  };

  const handleConfirm = async () => {
    if (!code.trim()) {
      setErrorMessage('Enter the 6-digit code from your email.');
      return;
    }
    setErrorMessage(undefined);
    setIsSubmitting(true);
    const result = await verifyEmailOtp(email.trim(), code.trim());
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
    }
    // On success, nothing else to do here — see the component doc above.
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage(undefined);
    const result = await requestEmailOtp(email.trim());
    setIsResending(false);
    setResendMessage(result.ok ? 'Code resent.' : result.error.message);
  };

  return (
    <View style={{ gap: theme.spacing.lg }} testID="inline-auth-gate">
      <View style={{ gap: theme.spacing.xs }}>
        <LargeTitle style={{ fontSize: 22, lineHeight: 28 }}>{title}</LargeTitle>
        <SecondaryBody>{step === 'email' ? description : `We sent a code to ${email.trim()}.`}</SecondaryBody>
      </View>

      {step === 'email' ? (
        <View style={{ gap: theme.spacing.md }}>
          <TextField
            testID="inline-auth-email"
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
          <Button
            testID="inline-auth-send-code"
            label="Send code"
            onPress={handleSendCode}
            loading={isSubmitting}
          />
        </View>
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          <TextField
            testID="inline-auth-code"
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
          <Button
            testID="inline-auth-confirm"
            label="Confirm"
            onPress={handleConfirm}
            loading={isSubmitting}
          />
          <Button
            testID="inline-auth-resend"
            label="Resend code"
            variant="secondary"
            onPress={handleResend}
            loading={isResending}
          />
          <Button
            testID="inline-auth-change-email"
            label="Use a different email"
            variant="tertiary"
            onPress={() => {
              setStep('email');
              setCode('');
              setErrorMessage(undefined);
              setResendMessage(undefined);
            }}
          />
          {resendMessage ? (
            <SecondaryBody testID="inline-auth-resend-message" accessibilityRole="alert">
              {resendMessage}
            </SecondaryBody>
          ) : null}
        </View>
      )}
    </View>
  );
}
