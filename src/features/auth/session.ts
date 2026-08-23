import { getSupabase } from '../../lib/supabase';
import { err, ok, type Result } from '../../lib/result';

/**
 * Email + password authentication. Supabase's `signUp` returns a `null`
 * session when the project requires email confirmation before first
 * sign-in (a per-project setting this client can't see or control) --
 * `needsEmailConfirmation` surfaces that so the UI can tell the user to
 * check their inbox instead of assuming they're signed in.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<Result<{ needsEmailConfirmation: boolean }>> {
  const { data, error } = await getSupabase().auth.signUp({ email, password });
  if (error) {
    return err({ message: error.message, code: error.code });
  }
  return ok({ needsEmailConfirmation: !data.session });
}

export async function signInWithPassword(email: string, password: string): Promise<Result<null>> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
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
