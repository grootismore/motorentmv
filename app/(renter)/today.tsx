import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/states/EmptyState';

export default function Today() {
  return (
    <Screen title="Today">
      <EmptyState
        title="Dashboard coming with the booking engine"
        message="Pickups, returns, overdue items and fleet status land with the availability calendar and booking engine (Prompt 4)."
      />
    </Screen>
  );
}
