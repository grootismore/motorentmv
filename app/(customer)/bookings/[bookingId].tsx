import { useLocalSearchParams } from 'expo-router';

import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';

export default function CustomerBookingDetail() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  return (
    <Screen title="Booking detail">
      <EmptyState
        title="Booking timeline coming in Phase 2"
        message={`Booking ${bookingId} — status timeline lands with the customer discovery flow (Prompt 5).`}
      />
    </Screen>
  );
}
