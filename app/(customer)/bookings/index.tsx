import { FlatList } from 'react-native';

import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { AuthPrompt } from '../../../src/features/auth/AuthPrompt';
import { useAuth } from '../../../src/features/auth/AuthProvider';
import { BookingListItem } from '../../../src/features/bookings/BookingListItem';
import { useCustomerBookings } from '../../../src/features/bookings/queries';

export default function CustomerBookings() {
  const { session } = useAuth();
  const bookings = useCustomerBookings(session?.user.id);

  if (session === undefined) {
    return <LoadingState label="Loading…" />;
  }

  if (session === null) {
    return (
      <Screen title="My bookings" titleStyle="large" scroll>
        <AuthPrompt
          testID="bookings-auth-prompt"
          icon="calendar-outline"
          heading="Sign in to see your bookings"
          message="Your upcoming, active and past rentals will show up here once you're signed in."
          gateTitle="Sign in to see your bookings"
          gateDescription="Enter your email — we'll send you a 6-digit code."
        />
      </Screen>
    );
  }

  return (
    <Screen title="My bookings" titleStyle="large" scroll={false}>
      {bookings.isLoading ? <LoadingState label="Loading your bookings…" /> : null}
      {bookings.isError ? (
        <ErrorState message={bookings.error.message} onRetry={() => bookings.refetch()} />
      ) : null}
      {bookings.data && bookings.data.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          message="Search for a motorcycle and request a booking to see it here."
        />
      ) : null}
      {bookings.data && bookings.data.length > 0 ? (
        <FlatList
          testID="customer-bookings-list"
          data={bookings.data}
          keyExtractor={(item) => item.id}
          onRefresh={() => bookings.refetch()}
          refreshing={bookings.isRefetching}
          renderItem={({ item }) => <BookingListItem booking={item} />}
        />
      ) : null}
    </Screen>
  );
}
