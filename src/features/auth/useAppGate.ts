import { useMyMembership } from '../organizations/queries';
import { useAuth } from './AuthProvider';
import { computeAppGate, type AppGate } from './computeAppGate';
import { useExperienceIntent } from './experience-intent';

export type { AppGate };

/**
 * The single source of truth `app/_layout.tsx` and `app/index.tsx` both
 * read to decide which route group is mounted/redirected to. See
 * computeAppGate.ts for the actual decision table.
 */
export function useAppGate(): AppGate {
  const { session } = useAuth();
  const { intent, isIntentLoading } = useExperienceIntent();
  const membership = useMyMembership(session?.user.id);

  return computeAppGate({
    hasSession: session === undefined ? undefined : session !== null,
    hasMembership: Boolean(membership.data),
    isMembershipLoading: membership.isLoading,
    intent,
    isIntentLoading,
  });
}
