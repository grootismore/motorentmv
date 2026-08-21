import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '../../lib/supabase';

interface AuthState {
  /** `undefined` while the initial session restore is in flight. */
  session: Session | null | undefined;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Restores the session on launch and keeps it in sync with
 * Supabase's own refresh/sign-out events — the single source of truth
 * for "is anyone signed in", never re-derived ad hoc per screen.
 *
 * When `supabase` is `null` (no project configured yet, see
 * src/lib/supabase.ts), this resolves immediately to a signed-out state
 * rather than hanging on a client that doesn't exist.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  // Computed directly, not via an effect: `supabase` is a module-level
  // constant, not external state to synchronize with, so there's nothing
  // asynchronous about the unconfigured case.
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isConfigured: supabase !== null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
