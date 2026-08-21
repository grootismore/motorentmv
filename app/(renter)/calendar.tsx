import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/states/EmptyState';

export default function Calendar() {
  return (
    <Screen title="Calendar">
      <EmptyState
        title="Availability calendar coming in Phase 1"
        message="Server-side overlap protection and the booking state machine land with Prompt 4."
      />
    </Screen>
  );
}
