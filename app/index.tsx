import { Redirect } from 'expo-router';

import { LoadingState } from '../src/components/states/LoadingState';
import { useAppGate } from '../src/features/auth/useAppGate';

/**
 * Ungrouped root route — always mounted, so it's a safe single place to
 * redirect into whichever gate is active. See useAppGate for how that's
 * derived from real session + organization membership state.
 */
export default function Index() {
  const gate = useAppGate();

  if (gate === 'loading') {
    return <LoadingState label="Loading your account…" />;
  }
  if (gate === 'customer') {
    return <Redirect href="/explore" />;
  }
  if (gate === 'renter') {
    return <Redirect href="/dashboard" />;
  }
  return <Redirect href="/role-select" />;
}
