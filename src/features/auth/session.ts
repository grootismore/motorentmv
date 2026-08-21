import { getSupabase } from '../../lib/supabase';
import { err, ok, type Result } from '../../lib/result';

/**
 * PRD §6.1: email magic link or OTP, phone OTP where the provider supports
 * reliable delivery. This project starts with email OTP (a 6-digit code,
 * not a deep-linked magic link) because it needs no universal-link setup
 * to work in a development build. Phone OTP is a later addition once an
 * SMS provider is confirmed for Maldivian numbers (see the Prompt 0
 * report's open assumptions) — never invent a custom password flow.
 */
export async function requestEmailOtp(email: string): Promise<Result<null>> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    return err({ message: error.message, code: error.code });
  }
  return ok(null);
}

export async function verifyEmailOtp(email: string, token: string): Promise<Result<null>> {
  const { error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' });
  if (error) {
    return err({ message: error.message, code: error.code });
  }
  return ok(null);
}

export async function signOut(): Promise<Result<null>> {
  const { error } = await getSupabase().auth.signOut();
  if (error) {
    return err({ message: error.message, code: error.code });
  }
  return ok(null);
}
