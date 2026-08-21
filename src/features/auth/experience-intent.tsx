import { createContext, useContext, useState, type PropsWithChildren } from 'react';

export type ExperienceIntent = 'customer' | 'renter' | null;

interface ExperienceIntentState {
  intent: ExperienceIntent;
  setIntent: (intent: ExperienceIntent) => void;
}

const ExperienceIntentContext = createContext<ExperienceIntentState | null>(null);

/**
 * Holds only *which button the user tapped* on the role-select screen
 * ("rent a motorcycle" vs "manage a rental business") — a UI hint for the
 * brief window between choosing and having real membership data, not a
 * source of truth. `useAppGate` overrides it the moment a real
 * organization membership is known; it exists at all only because a
 * signed-in renter with no org yet still needs to land somewhere sensible
 * (see useAppGate.ts).
 */
export function ExperienceIntentProvider({ children }: PropsWithChildren) {
  const [intent, setIntent] = useState<ExperienceIntent>(null);
  return (
    <ExperienceIntentContext.Provider value={{ intent, setIntent }}>
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
