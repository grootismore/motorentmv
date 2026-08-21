import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/states/EmptyState';

export default function Notifications() {
  return (
    <Screen title="Notifications">
      <EmptyState
        title="No notifications yet"
        message="Push and in-app notifications land in Phase 3 (Prompt 6)."
      />
    </Screen>
  );
}
