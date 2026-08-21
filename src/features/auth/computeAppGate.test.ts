import { computeAppGate } from './computeAppGate';

describe('computeAppGate', () => {
  it('is loading while the session is still being restored', () => {
    expect(
      computeAppGate({
        hasSession: undefined,
        hasMembership: false,
        isMembershipLoading: false,
        intent: null,
      }),
    ).toBe('loading');
  });

  it('goes to auth when there is no session', () => {
    expect(
      computeAppGate({ hasSession: false, hasMembership: false, isMembershipLoading: false, intent: null }),
    ).toBe('auth');
  });

  it('goes to renter when a membership exists, regardless of intent', () => {
    expect(
      computeAppGate({
        hasSession: true,
        hasMembership: true,
        isMembershipLoading: false,
        intent: 'customer',
      }),
    ).toBe('renter');
  });

  it('is loading while membership is still resolving after sign-in', () => {
    expect(
      computeAppGate({ hasSession: true, hasMembership: false, isMembershipLoading: true, intent: null }),
    ).toBe('loading');
  });

  it('goes to customer when signed in, no org, and the customer role was chosen', () => {
    expect(
      computeAppGate({
        hasSession: true,
        hasMembership: false,
        isMembershipLoading: false,
        intent: 'customer',
      }),
    ).toBe('customer');
  });

  it('defaults to renter (onboarding) when signed in, no org, and no customer intent was recorded', () => {
    expect(
      computeAppGate({ hasSession: true, hasMembership: false, isMembershipLoading: false, intent: null }),
    ).toBe('renter');
    expect(
      computeAppGate({
        hasSession: true,
        hasMembership: false,
        isMembershipLoading: false,
        intent: 'renter',
      }),
    ).toBe('renter');
  });
});
