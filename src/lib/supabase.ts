import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from './env';
import type { Database } from './database.types';

export type { Database } from './database.types';

/**
 * `null` until `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` are
 * configured (Phase 1). Nothing in Phase 0 calls this — it exists so the
 * typed API boundary and its consumers can be written against a stable
 * import today.
 */
export const supabase: SupabaseClient<Database> | null =
  env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    ? createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
        auth: {
          // TODO(Phase 1 auth): swap for a SecureStore-backed hybrid adapter
          // (encrypt the session, keep the key in SecureStore, blob in
          // AsyncStorage) before shipping real sessions — plain AsyncStorage
          // is not secure enough for auth tokens on its own.
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

/** True once EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY are set
 * — lets a screen distinguish "backend not configured yet" from a real
 * query failure without string-matching getSupabase()'s thrown message. */
export const isSupabaseConfigured = supabase !== null;

export function getSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
