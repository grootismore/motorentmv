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
 *
 * A signed-out user who has explicitly chosen customer intent (tapped
 * "Rent a motorcycle" on role-select) goes straight to 'customer' —
 * browsing/search/listing detail/quote are all anonymous by design (PRD
 * Prompt 5: authenticate only at request submission, not to window-shop).
 * A fresh user with no intent yet, and one who tapped "manage a rental
 * business", both still go through 'auth' first — role-select is still
 * the first screen anyone sees; only the customer path skips the
 * immediate OTP step it used to require. See (customer)'s screens for
 * how they handle "browsing, no session yet" themselves from there on
 * (an inline sign-in prompt, not a route redirect).
 */
export function computeAppGate(params: {
  hasSession: boolean | undefined;
  hasMembership: boolean;
  isMembershipLoading: boolean;
  intent: ExperienceIntent;
}): AppGate {
  const { hasSession, hasMembership, isMembershipLoading, intent } = params;
  if (hasSession === undefined) return 'loading';
  if (hasSession === false) return intent === 'customer' ? 'customer' : 'auth';
  if (hasMembership) return 'renter';
  if (isMembershipLoading) return 'loading';
  if (intent === 'customer') return 'customer';
  return 'renter';
}
