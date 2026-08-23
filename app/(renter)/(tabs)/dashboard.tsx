import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { OfflineState } from '../../../src/components/states/OfflineState';
import { Caption, SectionTitle } from '../../../src/components/Typography';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { useAuth } from '../../../src/features/auth/AuthProvider';
import { useRecentActivity } from '../../../src/features/activity/queries';
import { BookingListItem } from '../../../src/features/bookings/BookingListItem';
import { useOrgBookings } from '../../../src/features/bookings/queries';
import { DashboardHeader, DashboardLocationLine } from '../../../src/features/dashboard/DashboardHeader';
import { DashboardSkeleton } from '../../../src/features/dashboard/DashboardSkeleton';
import {
  DEMO_ACTIVITY,
  DEMO_BOOKINGS,
  DEMO_FINANCE_SUMMARY,
  DEMO_SUMMARY,
} from '../../../src/features/dashboard/demoData';
import { FinanceSummaryCard } from '../../../src/features/dashboard/FinanceSummaryCard';
import { QuickActions } from '../../../src/features/dashboard/QuickActions';
import { RecentActivityCard } from '../../../src/features/dashboard/RecentActivityCard';
import { SummaryCards } from '../../../src/features/dashboard/SummaryCards';
import { useFinanceSummary } from '../../../src/features/finance/queries';
import { useVehicles } from '../../../src/features/fleet/queries';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';
import { useUnreadNotificationCount } from '../../../src/features/notifications/queries';
import { isDemoMode } from '../../../src/lib/env';
import { isPast, maldivesDateKey } from '../../../src/lib/datetime';
import { useIsOffline } from '../../../src/lib/useIsOffline';

/**
 * The renter's main landing screen -- supersedes the old (tabs)/today.tsx,
 * which is now folded into this screen's "Today" section rather than
 * living as a separate tab (see the Prompt 7 delivery report for the
 * full tab-restructure rationale).
 */
export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { organizationId, organization } = useCurrentOrganization();
  const isOffline = useIsOffline();
  const todayKey = maldivesDateKey(new Date().toISOString());

  const vehicles = useVehicles(organizationId);
  const pendingBookings = useOrgBookings(organizationId, [
    'requested',
    'needs_info',
    'accepted',
    'ready',
    'active',
  ]);
  const unreadCount = useUnreadNotificationCount(session?.user.id);
  const financeSummary = useFinanceSummary(organizationId);
  const recentActivity = useRecentActivity(organizationId);

  const refetchAll = () => {
    void vehicles.refetch();
    void pendingBookings.refetch();
    void unreadCount.refetch();
    void financeSummary.refetch();
    void recentActivity.refetch();
  };

  const headerRight = (
    <DashboardHeader
      businessName={organization.name}
      location={organization.default_location}
      unreadNotificationCount={unreadCount.data ?? 0}
    />
  );

  if (vehicles.isLoading || pendingBookings.isLoading) {
    return (
      <Screen title={organization.name} titleStyle="large" headerRight={headerRight}>
        <DashboardLocationLine location={organization.default_location} />
        <View style={{ marginTop: theme.spacing.lg }}>
          <DashboardSkeleton />
        </View>
      </Screen>
    );
  }

  if (vehicles.isError || pendingBookings.isError) {
    return (
      <Screen title={organization.name} titleStyle="large" headerRight={headerRight}>
        <ErrorState
          message={vehicles.error?.message ?? pendingBookings.error?.message}
          onRetry={refetchAll}
        />
      </Screen>
    );
  }

  const vehicleList = vehicles.data ?? [];
  const bookings = pendingBookings.data ?? [];
  // Zero vehicles and zero bookings are the same real state in this
  // schema (a booking can't exist without a vehicle) -- "empty business"
  // and "empty fleet" collapse into one screen here rather than two
  // artificially distinct ones; see the delivery report.
  const isFleetEmpty = vehicleList.length === 0;
  const showDemoContent = isFleetEmpty && isDemoMode;

  if (isFleetEmpty && !showDemoContent) {
    return (
      <Screen title={organization.name} titleStyle="large" headerRight={headerRight}>
        <DashboardLocationLine location={organization.default_location} />
        <EmptyState
          icon="bicycle-outline"
          title="Welcome to RideFinder"
          message="Add your first motorcycle to start managing availability, bookings and finances."
          actionLabel="Add vehicle"
          onAction={() => router.push('/fleet/new')}
        />
      </Screen>
    );
  }

  const summary = showDemoContent
    ? DEMO_SUMMARY
    : {
        availableCount: vehicleList.filter((v) => v.status === 'available').length,
        rentedCount: vehicleList.filter((v) => v.status === 'rented').length,
        maintenanceCount: vehicleList.filter((v) => v.status === 'maintenance').length,
        awaitingApprovalCount: bookings.filter((b) => b.status === 'requested').length,
      };

  const todayBookings = showDemoContent
    ? { pickups: DEMO_BOOKINGS, returns: [], overdue: [] }
    : {
        pickups: bookings.filter(
          (b) =>
            (b.status === 'accepted' || b.status === 'ready') && maldivesDateKey(b.starts_at) === todayKey,
        ),
        returns: bookings.filter((b) => b.status === 'active' && maldivesDateKey(b.ends_at) === todayKey),
        overdue: bookings.filter((b) => b.status === 'active' && isPast(b.ends_at)),
      };

  const financeData = showDemoContent ? DEMO_FINANCE_SUMMARY : financeSummary.data;
  const activityEvents = showDemoContent ? DEMO_ACTIVITY : (recentActivity.data ?? []);

  return (
    <Screen
      title={organization.name}
      titleStyle="large"
      scroll
      refreshing={!showDemoContent && (vehicles.isRefetching || pendingBookings.isRefetching)}
      onRefresh={showDemoContent ? undefined : refetchAll}
      headerRight={headerRight}
    >
      <DashboardLocationLine location={organization.default_location} />

      {isOffline ? <OfflineState /> : null}

      {showDemoContent ? (
        <Caption
          style={{ color: theme.colors.information, fontWeight: '600', marginBottom: theme.spacing.sm }}
        >
          Demo preview — add a vehicle to see your real dashboard
        </Caption>
      ) : null}

      <View style={{ gap: theme.spacing.xl }} testID="dashboard-content">
        <SummaryCards
          availableCount={summary.availableCount}
          rentedCount={summary.rentedCount}
          awaitingApprovalCount={summary.awaitingApprovalCount}
          maintenanceCount={summary.maintenanceCount}
        />

        {financeData ? (
          <FinanceSummaryCard summary={financeData} />
        ) : financeSummary.isError ? (
          <ErrorState title="Couldn't load finance summary" onRetry={() => financeSummary.refetch()} />
        ) : (
          <LoadingState label="Loading finance summary…" />
        )}

        <View style={{ gap: theme.spacing.sm }} testID="dashboard-today-section">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionTitle>Today</SectionTitle>
            <Pressable
              testID="dashboard-view-calendar"
              accessibilityRole="button"
              accessibilityLabel="View full calendar"
              onPress={() => router.push('/calendar')}
            >
              <Caption style={{ color: theme.colors.lagoonPrimary, fontWeight: '600' }}>
                View calendar
              </Caption>
            </Pressable>
          </View>

          {todayBookings.overdue.length > 0 ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Caption style={{ color: theme.colors.overdue, fontWeight: '700' }}>
                {todayBookings.overdue.length} overdue return{todayBookings.overdue.length === 1 ? '' : 's'}
              </Caption>
              {todayBookings.overdue.map((b) => (
                <BookingListItem key={b.id} booking={b} demo={showDemoContent} />
              ))}
            </View>
          ) : null}

          {todayBookings.pickups.length === 0 &&
          todayBookings.returns.length === 0 &&
          todayBookings.overdue.length === 0 ? (
            <Caption>Nothing scheduled today.</Caption>
          ) : null}

          {todayBookings.pickups.length > 0 ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Caption style={{ fontWeight: '600' }}>Pick-ups today</Caption>
              {todayBookings.pickups.map((b) => (
                <BookingListItem key={b.id} booking={b} demo={showDemoContent} />
              ))}
            </View>
          ) : null}

          {todayBookings.returns.length > 0 ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Caption style={{ fontWeight: '600' }}>Returns today</Caption>
              {todayBookings.returns.map((b) => (
                <BookingListItem key={b.id} booking={b} demo={showDemoContent} />
              ))}
            </View>
          ) : null}
        </View>

        <QuickActions
          onAddVehicle={() => router.push('/fleet/new')}
          onCreateBooking={() => router.push('/bookings/new')}
          onRecordIncome={() => router.push('/finance/record-income')}
          onRecordExpense={() => router.push('/finance/record-expense')}
        />

        <RecentActivityCard events={activityEvents} />
      </View>
    </Screen>
  );
}
