import { useLocalSearchParams } from 'expo-router';

import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';

export default function ListingDetail() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();

  return (
    <Screen title="Listing">
      <EmptyState
        title="Listing detail coming in Phase 2"
        message={`Vehicle ${vehicleId} — photos, terms and quote land with the customer discovery flow (Prompt 5).`}
      />
    </Screen>
  );
}
