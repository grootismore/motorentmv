import { createContext, useContext, useState, type PropsWithChildren } from 'react';

export type Experience = 'customer' | 'renter' | null;

interface AppShellState {
  experience: Experience;
  selectExperience: (experience: Experience) => void;
}

const AppShellContext = createContext<AppShellState | null>(null);

/**
 * Temporary, Phase-0-only placeholder for "which experience is active" so
 * the (auth)/(customer)/(renter) route groups have something to gate on and
 * are manually navigable before real auth exists. Replace with derived
 * session/role state once auth + org membership land (Phase 1, Prompt 3):
 * a signed-in user's role(s) should decide this, not local component state.
 */
export function AppShellProvider({ children }: PropsWithChildren) {
  const [experience, setExperience] = useState<Experience>(null);
  return (
    <AppShellContext.Provider value={{ experience, selectExperience: setExperience }}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell(): AppShellState {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error('useAppShell must be used within an AppShellProvider');
  }
  return ctx;
}
