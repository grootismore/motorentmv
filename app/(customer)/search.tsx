import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/states/EmptyState';

export default function Search() {
  return (
    <Screen title="Search">
      <EmptyState
        title="Search coming in Phase 2"
        message="Date, island/zone and filters will be implemented with the customer discovery flow (Prompt 5)."
      />
    </Screen>
  );
}
