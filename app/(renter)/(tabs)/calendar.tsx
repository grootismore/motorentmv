import { SectionList, View } from 'react-native';

import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { SectionTitle } from '../../../src/components/Typography';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { BookingListItem } from '../../../src/features/bookings/BookingListItem';
import {
  PENDING_BOOKING_STATUSES,
  useOrgBookings,
  type BookingWithDetails,
} from '../../../src/features/bookings/queries';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';
import { formatMaldivesDate, maldivesDateKey } from '../../../src/lib/datetime';

/**
 * A lightweight agenda, not a month grid — grouping the org's upcoming and
 * in-progress bookings by pickup date. No calendar/date-picker library was
 * added for this (PRD Phase 0 constraint: prefer Expo-supported packages,
 * avoid unnecessary native dependencies); a grid view can replace this
 * later without changing the data underneath it.
 */
export default function Calendar() {
  const theme = useTheme();
  const { organizationId } = useCurrentOrganization();
  const bookings = useOrgBookings(organizationId, PENDING_BOOKING_STATUSES);

  if (bookings.isLoading) {
    return <LoadingState label="Loading calendar…" />;
  }

  if (bookings.isError) {
    return <ErrorState message={bookings.error.message} onRetry={() => bookings.refetch()} />;
  }

  if (!bookings.data || bookings.data.length === 0) {
    return (
      <Screen title="Calendar" titleStyle="large">
        <EmptyState
          icon="calendar-outline"
          title="Nothing scheduled"
          message="Accepted, ready and active bookings will appear here grouped by pickup date."
        />
      </Screen>
    );
  }

  const byDate = new Map<string, BookingWithDetails[]>();
  for (const booking of bookings.data) {
    const key = maldivesDateKey(booking.starts_at);
    const group = byDate.get(key) ?? [];
    group.push(booking);
    byDate.set(key, group);
  }
  const sections = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, data]) => ({
      title: formatMaldivesDate(data[0]?.starts_at ?? new Date().toISOString()),
      dateKey,
      data,
    }));

  return (
    <Screen title="Calendar" titleStyle="large" scroll={false}>
      <SectionList
        testID="calendar-agenda"
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor: theme.colors.pearlBackground, paddingVertical: theme.spacing.sm }}>
            <SectionTitle>{section.title}</SectionTitle>
          </View>
        )}
        renderItem={({ item }) => <BookingListItem booking={item} />}
        onRefresh={() => bookings.refetch()}
        refreshing={bookings.isRefetching}
        stickySectionHeadersEnabled
      />
    </Screen>
  );
}
