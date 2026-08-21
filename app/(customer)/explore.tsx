import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/states/EmptyState';

export default function Explore() {
  return (
    <Screen title="Explore">
      <EmptyState
        title="No listings yet"
        message="Date/zone search and listing results land in Phase 2 (Prompt 5)."
      />
    </Screen>
  );
}
