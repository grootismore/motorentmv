import { computeAppGate } from './computeAppGate';

describe('computeAppGate', () => {
  it('is loading while the session is still being restored', () => {
    expect(
      computeAppGate({
        hasSession: undefined,
        hasMembership: false,
        isMembershipLoading: false,
        intent: null,
        isIntentLoading: false,
      }),
    ).toBe('loading');
  });

  it('is loading while the persisted intent is still being read back', () => {
    expect(
      computeAppGate({
        hasSession: false,
        hasMembership: false,
        isMembershipLoading: false,
        intent: null,
        isIntentLoading: true,
      }),
    ).toBe('loading');
  });

  it('goes to auth when there is no session and no intent chosen yet', () => {
    expect(
      computeAppGate({
        hasSession: false,
        hasMembership: false,
        isMembershipLoading: false,
        intent: null,
        isIntentLoading: false,
      }),
    ).toBe('auth');
  });

  it('goes to auth (not customer) when signed out and renter intent was chosen', () => {
    expect(
      computeAppGate({
        hasSession: false,
        hasMembership: false,
        isMembershipLoading: false,
        intent: 'renter',
        isIntentLoading: false,
      }),
    ).toBe('auth');
  });

  it('goes straight to customer, anonymously, when signed out and customer intent was chosen', () => {
    // PRD Prompt 5: browsing/search/listing/quote are anonymous; sign-in
    // only happens inline at request submission, not as a route gate.
    expect(
      computeAppGate({
        hasSession: false,
        hasMembership: false,
        isMembershipLoading: false,
        intent: 'customer',
        isIntentLoading: false,
      }),
    ).toBe('customer');
  });

  it('goes to renter when a membership exists, regardless of intent', () => {
    expect(
      computeAppGate({
        hasSession: true,
        hasMembership: true,
        isMembershipLoading: false,
        intent: 'customer',
        isIntentLoading: false,
      }),
    ).toBe('renter');
  });

  it('is loading while membership is still resolving after sign-in', () => {
    expect(
      computeAppGate({
        hasSession: true,
        hasMembership: false,
        isMembershipLoading: true,
        intent: null,
        isIntentLoading: false,
      }),
    ).toBe('loading');
  });

  it('goes to customer when signed in, no org, and the customer role was chosen', () => {
    expect(
      computeAppGate({
        hasSession: true,
        hasMembership: false,
        isMembershipLoading: false,
        intent: 'customer',
        isIntentLoading: false,
      }),
    ).toBe('customer');
  });

  it('goes to auth (re-asks) when signed in, no org, and no customer intent was recorded', () => {
    // This used to default to 'renter' (silently pushing every returning
    // customer with no fleet of their own into "create your organization"
    // onboarding). See computeAppGate.ts's doc comment.
    expect(
      computeAppGate({
        hasSession: true,
        hasMembership: false,
        isMembershipLoading: false,
        intent: null,
        isIntentLoading: false,
      }),
    ).toBe('auth');
    expect(
      computeAppGate({
        hasSession: true,
        hasMembership: false,
        isMembershipLoading: false,
        intent: 'renter',
        isIntentLoading: false,
      }),
    ).toBe('auth');
  });
});
