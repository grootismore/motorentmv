import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/states/EmptyState';

export default function Today() {
  return (
    <Screen title="Today">
      <EmptyState
        title="No organization yet"
        message="Pickups, returns, overdue items and fleet status land once org onboarding and the booking engine exist (Phase 1, Prompts 3-4)."
      />
    </Screen>
  );
}
