import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { ChipSelect } from '../../../src/components/ChipSelect';
import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { BookingListItem } from '../../../src/features/bookings/BookingListItem';
import { useOrgBookings, type BookingStatus } from '../../../src/features/bookings/queries';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';

type Filter = 'needs_action' | 'upcoming' | 'active' | 'history';

const FILTER_STATUSES: Record<Filter, BookingStatus[]> = {
  needs_action: ['requested', 'needs_info'],
  upcoming: ['accepted', 'ready'],
  active: ['active'],
  history: ['completed', 'declined', 'cancelled'],
};

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'needs_action', label: 'Needs action' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'history', label: 'History' },
];

export default function RenterBookings() {
  const theme = useTheme();
  const { organizationId } = useCurrentOrganization();
  const [filter, setFilter] = useState<Filter>('needs_action');
  const bookings = useOrgBookings(organizationId, FILTER_STATUSES[filter]);

  return (
    <Screen
      title="Bookings"
      description="Inbox with conflict warnings and customer information."
      scroll={false}
    >
      <View style={{ marginBottom: theme.spacing.md }}>
        <ChipSelect
          testID="bookings-filter"
          label="Filter"
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {bookings.isLoading ? <LoadingState label="Loading bookings…" /> : null}

      {bookings.isError ? (
        <ErrorState message={bookings.error.message} onRetry={() => bookings.refetch()} />
      ) : null}

      {bookings.data && bookings.data.length === 0 ? (
        <EmptyState title="Nothing here" message="No bookings currently match this filter." />
      ) : null}

      {bookings.data && bookings.data.length > 0 ? (
        <FlatList
          testID="bookings-list"
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
