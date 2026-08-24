import Testing

@testable import RideFinderCore

// Mirrors src/features/auth/computeAppGate.test.ts's cases exactly
// (including the fix applied in that file: the ambiguous "signed in, no
// org, no known intent" case goes to .auth, not .renter).
@Suite struct AppGateTests {
    @Test func isLoadingWhileTheSessionIsStillBeingRestored() {
        let gate = AppGateDecision.compute(hasSession: nil, hasMembership: false, isMembershipLoading: false, intent: nil, isIntentLoading: false)
        #expect(gate == .loading)
    }

    @Test func isLoadingWhileThePersistedIntentIsStillBeingReadBack() {
        let gate = AppGateDecision.compute(hasSession: false, hasMembership: false, isMembershipLoading: false, intent: nil, isIntentLoading: true)
        #expect(gate == .loading)
    }

    @Test func goesToAuthWhenThereIsNoSessionAndNoIntentChosenYet() {
        let gate = AppGateDecision.compute(hasSession: false, hasMembership: false, isMembershipLoading: false, intent: nil, isIntentLoading: false)
        #expect(gate == .auth)
    }

    @Test func goesToAuthNotCustomerWhenSignedOutAndRenterIntentWasChosen() {
        let gate = AppGateDecision.compute(hasSession: false, hasMembership: false, isMembershipLoading: false, intent: .renter, isIntentLoading: false)
        #expect(gate == .auth)
    }

    @Test func goesStraightToCustomerAnonymouslyWhenSignedOutAndCustomerIntentWasChosen() {
        let gate = AppGateDecision.compute(hasSession: false, hasMembership: false, isMembershipLoading: false, intent: .customer, isIntentLoading: false)
        #expect(gate == .customer)
    }

    @Test func goesToRenterWhenAMembershipExistsRegardlessOfIntent() {
        let gate = AppGateDecision.compute(hasSession: true, hasMembership: true, isMembershipLoading: false, intent: .customer, isIntentLoading: false)
        #expect(gate == .renter)
    }

    @Test func isLoadingWhileMembershipIsStillResolvingAfterSignIn() {
        let gate = AppGateDecision.compute(hasSession: true, hasMembership: false, isMembershipLoading: true, intent: nil, isIntentLoading: false)
        #expect(gate == .loading)
    }

    @Test func goesToCustomerWhenSignedInNoOrgAndTheCustomerRoleWasChosen() {
        let gate = AppGateDecision.compute(hasSession: true, hasMembership: false, isMembershipLoading: false, intent: .customer, isIntentLoading: false)
        #expect(gate == .customer)
    }

    @Test func goesToAuthReAsksWhenSignedInNoOrgAndNoCustomerIntentWasRecorded() {
        // This used to default to .renter (silently pushing every
        // returning customer with no fleet of their own into "create
        // your organization" onboarding). See AppGate.swift's doc comment.
        let noIntent = AppGateDecision.compute(hasSession: true, hasMembership: false, isMembershipLoading: false, intent: nil, isIntentLoading: false)
        #expect(noIntent == .auth)

        let renterIntent = AppGateDecision.compute(hasSession: true, hasMembership: false, isMembershipLoading: false, intent: .renter, isIntentLoading: false)
        #expect(renterIntent == .auth)
    }
}
