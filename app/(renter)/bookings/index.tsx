import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';

export default function RenterBookings() {
  return (
    <Screen title="Bookings" description="Inbox with conflict warnings and customer information.">
      <EmptyState
        title="No requests yet"
        message="The booking inbox lands with the availability calendar and booking engine (Phase 1, Prompt 4)."
      />
    </Screen>
  );
}
