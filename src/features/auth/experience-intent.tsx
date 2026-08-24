import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

export type ExperienceIntent = 'customer' | 'renter' | null;

const STORAGE_KEY = 'ridefinder-experience-intent';

interface ExperienceIntentState {
  intent: ExperienceIntent;
  /**
   * True until the persisted intent (if any) has been read back from
   * AsyncStorage. computeAppGate treats this the same as "session still
   * restoring" — see its own doc comment — so a returning user is never
   * routed on a false "no intent recorded yet" for the one tick before
   * storage resolves.
   */
  isIntentLoading: boolean;
  setIntent: (intent: ExperienceIntent) => void;
}

const ExperienceIntentContext = createContext<ExperienceIntentState | null>(null);

/**
 * Holds *which button the user tapped* on the role-select screen ("rent a
 * motorcycle" vs "manage a rental business"), persisted to AsyncStorage so
 * it survives an app restart — not just an in-memory UI hint. This matters
 * most for a signed-in customer with no organization: without a persisted
 * intent, every fresh launch would look identical to a brand-new user (see
 * computeAppGate.ts). Real membership still overrides this the moment it's
 * known; this only decides where someone with no org lands.
 */
export function ExperienceIntentProvider({ children }: PropsWithChildren) {
  const [intent, setIntentState] = useState<ExperienceIntent>(null);
  const [isIntentLoading, setIsIntentLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'customer' || stored === 'renter') {
          setIntentState(stored);
        }
      })
      .finally(() => {
        if (!cancelled) setIsIntentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setIntent = (next: ExperienceIntent) => {
    setIntentState(next);
    if (next === null) {
      void AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      void AsyncStorage.setItem(STORAGE_KEY, next);
    }
  };

  return (
    <ExperienceIntentContext.Provider value={{ intent, isIntentLoading, setIntent }}>
      {children}
    </ExperienceIntentContext.Provider>
  );
}

export function useExperienceIntent(): ExperienceIntentState {
  const ctx = useContext(ExperienceIntentContext);
  if (!ctx) {
    throw new Error('useExperienceIntent must be used within an ExperienceIntentProvider');
  }
  return ctx;
}
