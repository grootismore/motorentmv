import type { ExperienceIntent } from './experience-intent';

export type AppGate = 'loading' | 'auth' | 'customer' | 'renter';

/**
 * Pure decision table, kept in its own zero-dependency file (rather than
 * alongside useAppGate.ts) specifically so it's testable without dragging
 * in the hook's real imports — those eventually reach src/lib/supabase.ts,
 * which imports @react-native-async-storage/async-storage, whose native
 * module isn't mocked by default in this project's Jest setup. Real
 * membership always wins over the one-time role-select tap: a signed-in
 * user who already owns or joined an organization is a renter no matter
 * which button they originally pressed.
 */
export function computeAppGate(params: {
  hasSession: boolean | undefined;
  hasMembership: boolean;
  isMembershipLoading: boolean;
  intent: ExperienceIntent;
}): AppGate {
  const { hasSession, hasMembership, isMembershipLoading, intent } = params;
  if (hasSession === undefined) return 'loading';
  if (hasSession === false) return 'auth';
  if (hasMembership) return 'renter';
  if (isMembershipLoading) return 'loading';
  if (intent === 'customer') return 'customer';
  return 'renter';
}
