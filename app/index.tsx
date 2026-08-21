import { Redirect } from 'expo-router';

import { useAppShell } from '../src/lib/app-shell';

/**
 * Ungrouped root route — always mounted, so it's a safe single place to
 * redirect into whichever experience is active. Real logic (session
 * restoration → role) replaces `useAppShell` in Phase 1.
 */
export default function Index() {
  const { experience } = useAppShell();

  if (experience === 'customer') {
    return <Redirect href="/explore" />;
  }
  if (experience === 'renter') {
    return <Redirect href="/today" />;
  }
  return <Redirect href="/role-select" />;
}
