import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';

export default function CustomerBookings() {
  return (
    <Screen title="My bookings">
      <EmptyState
        title="No bookings yet"
        message="The request-to-book flow and booking timeline land in Phase 2 (Prompt 5)."
      />
    </Screen>
  );
}
