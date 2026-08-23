import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { View } from 'react-native';

import { GroupedSection } from '../../../src/components/GroupedSection';
import { KPITile, type KPITone } from '../../../src/components/KPITile';
import { Screen } from '../../../src/components/Screen';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { Body, Caption, SectionTitle } from '../../../src/components/Typography';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { BookingListItem } from '../../../src/features/bookings/BookingListItem';
import { useOrgBookings } from '../../../src/features/bookings/queries';
import { useVehicles, type Vehicle } from '../../../src/features/fleet/queries';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';
import { isPast, maldivesDateKey } from '../../../src/lib/datetime';

const FLEET_STATUS_LABEL: Record<Vehicle['status'], string> = {
  draft: 'Draft',
  available: 'Available',
  reserved: 'Reserved',
  rented: 'Rented',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
};

const FLEET_STATUS_ICON: Record<Vehicle['status'], keyof typeof Ionicons.glyphMap> = {
  draft: 'create-outline',
  available: 'checkmark-circle-outline',
  reserved: 'bookmark-outline',
  rented: 'key-outline',
  maintenance: 'construct-outline',
  inactive: 'pause-circle-outline',
};

const FLEET_STATUS_TONE: Record<Vehicle['status'], KPITone> = {
  draft: 'lagoon',
  available: 'success',
  reserved: 'information',
  rented: 'lagoon',
  maintenance: 'overdue',
  inactive: 'information',
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
    <Screen
      title="Today"
      titleStyle="large"
      scroll
      refreshing={needsAction.isRefetching || confirmed.isRefetching || vehicles.isRefetching}
      onRefresh={() => {
        void needsAction.refetch();
        void confirmed.refetch();
        void vehicles.refetch();
      }}
    >
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }} testID="today-stats">
          <KPITile icon="log-in-outline" tone="lagoon" value={pickupsToday.length} label="Pickups today" />
          <KPITile
            icon="log-out-outline"
            tone="information"
            value={returnsToday.length}
            label="Returns today"
          />
          <KPITile icon="bicycle-outline" tone="success" value={activeNow.length} label="Active" />
          <KPITile icon="alert-circle-outline" tone="overdue" value={overdue.length} label="Overdue" />
        </View>

        {(needsAction.data?.length ?? 0) > 0 ? (
          <Link href="/bookings" asChild>
            <View
              accessibilityRole="link"
              testID="today-needs-action-link"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: theme.spacing.md,
                backgroundColor: theme.colors.glassSurfaceStrong,
                borderRadius: theme.radii.card,
              }}
            >
              <Body style={{ color: theme.colors.lagoonPrimary, fontWeight: '600' }}>
                {needsAction.data?.length} request{needsAction.data?.length === 1 ? '' : 's'} waiting on you
              </Body>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.lagoonPrimary} />
            </View>
          </Link>
        ) : null}

        {overdue.length > 0 ? (
          <View style={{ gap: theme.spacing.sm }}>
            <SectionTitle style={{ color: theme.colors.overdue }}>Overdue returns</SectionTitle>
            {overdue.map((b) => (
              <BookingListItem key={b.id} booking={b} />
            ))}
          </View>
        ) : null}

        <View style={{ gap: theme.spacing.sm }}>
          <SectionTitle>Pickups today</SectionTitle>
          {pickupsToday.length === 0 ? (
            <Caption>No pickups scheduled today.</Caption>
          ) : (
            pickupsToday.map((b) => <BookingListItem key={b.id} booking={b} />)
          )}
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <SectionTitle>Returns today</SectionTitle>
          {returnsToday.length === 0 ? (
            <Caption>No returns scheduled today.</Caption>
          ) : (
            returnsToday.map((b) => <BookingListItem key={b.id} booking={b} />)
          )}
        </View>

        <GroupedSection title="Fleet status" testID="today-fleet-status">
          {Object.keys(fleetCounts).length === 0 ? (
            <Caption>No vehicles in your fleet yet.</Caption>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {Object.entries(fleetCounts).map(([status, count]) => (
                <KPITile
                  key={status}
                  icon={FLEET_STATUS_ICON[status as Vehicle['status']]}
                  tone={FLEET_STATUS_TONE[status as Vehicle['status']]}
                  value={count}
                  label={FLEET_STATUS_LABEL[status as Vehicle['status']]}
                />
              ))}
            </View>
          )}
        </GroupedSection>
      </View>
    </Screen>
  );
}
