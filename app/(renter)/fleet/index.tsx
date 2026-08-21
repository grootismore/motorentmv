import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';

export default function Fleet() {
  return (
    <Screen title="Fleet">
      <EmptyState
        title="No motorcycles yet"
        message="Fleet list/detail/create/edit screens land with renter onboarding (Phase 1, Prompt 3)."
      />
    </Screen>
  );
}
