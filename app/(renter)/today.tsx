import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '../../src/components/Screen';
import { ErrorState } from '../../src/components/states/ErrorState';
import { LoadingState } from '../../src/components/states/LoadingState';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { BookingListItem } from '../../src/features/bookings/BookingListItem';
import { useOrgBookings } from '../../src/features/bookings/queries';
import { useVehicles, type Vehicle } from '../../src/features/fleet/queries';
import { useCurrentOrganization } from '../../src/features/organizations/CurrentOrganizationContext';
import { isPast, maldivesDateKey } from '../../src/lib/datetime';

const sectionTitle = { fontSize: 18, fontWeight: '700' as const };

function StatChip({ label, count }: { label: string; count: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        minWidth: 96,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary }}>{count}</Text>
      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>
        {label}
      </Text>
    </View>
  );
}

const FLEET_STATUS_LABEL: Record<Vehicle['status'], string> = {
  draft: 'Draft',
  available: 'Available',
  reserved: 'Reserved',
  rented: 'Rented',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
};

export default function Today() {
  const theme = useTheme();
  const { organizationId } = useCurrentOrganization();
  const todayKey = maldivesDateKey(new Date().toISOString());

  const needsAction = useOrgBookings(organizationId, ['requested', 'needs_info']);
  const confirmed = useOrgBookings(organizationId, ['accepted', 'ready', 'active']);
  const vehicles = useVehicles(organizationId);

  if (needsAction.isLoading || confirmed.isLoading || vehicles.isLoading) {
    return <LoadingState label="Loading today's schedule…" />;
  }

  if (needsAction.isError || confirmed.isError || vehicles.isError) {
    return (
      <ErrorState
        message={needsAction.error?.message ?? confirmed.error?.message ?? vehicles.error?.message}
        onRetry={() => {
          void needsAction.refetch();
          void confirmed.refetch();
          void vehicles.refetch();
        }}
      />
    );
  }

  const confirmedBookings = confirmed.data ?? [];
  const pickupsToday = confirmedBookings.filter(
    (b) => (b.status === 'accepted' || b.status === 'ready') && maldivesDateKey(b.starts_at) === todayKey,
  );
  const returnsToday = confirmedBookings.filter(
    (b) => b.status === 'active' && maldivesDateKey(b.ends_at) === todayKey,
  );
  const activeNow = confirmedBookings.filter((b) => b.status === 'active');
  const overdue = activeNow.filter((b) => isPast(b.ends_at));

  const fleetCounts = (vehicles.data ?? []).reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Screen title="Today" scroll>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }} testID="today-stats">
          <StatChip label="Pickups today" count={pickupsToday.length} />
          <StatChip label="Returns today" count={returnsToday.length} />
          <StatChip label="Active rentals" count={activeNow.length} />
          <StatChip label="Overdue" count={overdue.length} />
        </View>

        {(needsAction.data?.length ?? 0) > 0 ? (
          <Link href="/bookings" asChild>
            <Text
              style={{ color: theme.colors.primary, fontWeight: '600' }}
              accessibilityRole="link"
              testID="today-needs-action-link"
            >
              {needsAction.data?.length} request{needsAction.data?.length === 1 ? '' : 's'} waiting on you →
            </Text>
          </Link>
        ) : null}

        {overdue.length > 0 ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={[sectionTitle, { color: theme.colors.danger }]}>Overdue returns</Text>
            {overdue.map((b) => (
              <BookingListItem key={b.id} booking={b} />
            ))}
          </View>
        ) : null}

        <View style={{ gap: theme.spacing.sm }}>
          <Text style={[sectionTitle, { color: theme.colors.textPrimary }]}>Pickups today</Text>
          {pickupsToday.length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary }}>No pickups scheduled today.</Text>
          ) : (
            pickupsToday.map((b) => <BookingListItem key={b.id} booking={b} />)
          )}
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text style={[sectionTitle, { color: theme.colors.textPrimary }]}>Returns today</Text>
          {returnsToday.length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary }}>No returns scheduled today.</Text>
          ) : (
            returnsToday.map((b) => <BookingListItem key={b.id} booking={b} />)
          )}
        </View>

        <View style={{ gap: theme.spacing.sm }} testID="today-fleet-status">
          <Text style={[sectionTitle, { color: theme.colors.textPrimary }]}>Fleet status</Text>
          {Object.keys(fleetCounts).length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary }}>No vehicles in your fleet yet.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {Object.entries(fleetCounts).map(([status, count]) => (
                <StatChip
                  key={status}
                  label={FLEET_STATUS_LABEL[status as Vehicle['status']]}
                  count={count}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}
