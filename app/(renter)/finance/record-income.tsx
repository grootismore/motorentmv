import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { GlassSurface } from '../../../src/components/GlassSurface';
import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { CardTitle, Caption } from '../../../src/components/Typography';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { useOrgBookings } from '../../../src/features/bookings/queries';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';
import { formatMaldivesDate } from '../../../src/lib/datetime';
import { formatMvr } from '../../../src/lib/money';

/**
 * "Record income" isn't a standalone form -- `transactions.booking_id` is
 * NOT NULL (20260821120015_transactions.sql), so every payment/refund/
 * adjustment must be attached to a real booking by schema design; there
 * is no concept of unattributed business income to record here yet
 * (Prompt 11, "renter finance tracking," explicitly plans to make
 * booking optional on this table). This screen is the honest shape of
 * "record income" given the schema as it exists today: pick which
 * booking the payment belongs to, then land on that booking's own
 * PaymentLedger (already a full record-a-payment form) to record it.
 */
export default function RecordIncome() {
  const theme = useTheme();
  const { organizationId } = useCurrentOrganization();
  const bookings = useOrgBookings(organizationId, ['accepted', 'ready', 'active']);

  if (bookings.isLoading) {
    return (
      <Screen title="Record income">
        <LoadingState label="Loading bookings…" />
      </Screen>
    );
  }

  if (bookings.isError) {
    return (
      <Screen title="Record income">
        <ErrorState message={bookings.error.message} onRetry={() => bookings.refetch()} />
      </Screen>
    );
  }

  const list = bookings.data ?? [];

  if (list.length === 0) {
    return (
      <Screen title="Record income">
        <EmptyState
          icon="cash-outline"
          title="No active bookings"
          message="Income is recorded against a specific booking — once one is confirmed, ready or active, it will appear here."
        />
      </Screen>
    );
  }

  return (
    <Screen title="Record income" description="Choose which booking this payment is for." scroll={false}>
      <View style={{ gap: theme.spacing.sm }} testID="record-income-list">
        {list.map((booking) => {
          const vehicle = booking.vehicle;
          const vehicleName = vehicle
            ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || vehicle.registration_number
            : 'Unknown vehicle';
          return (
            <Link
              key={booking.id}
              href={{ pathname: '/bookings/[bookingId]', params: { bookingId: booking.id } }}
              asChild
            >
              <Pressable
                testID={`record-income-booking-${booking.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${vehicleName}, ${booking.customer?.full_name ?? 'customer'}`}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <GlassSurface style={{ padding: theme.spacing.lg, gap: theme.spacing.xs }}>
                  <CardTitle>{vehicleName}</CardTitle>
                  <Caption>{booking.customer?.full_name ?? 'Customer'}</Caption>
                  <Caption>
                    {formatMaldivesDate(booking.starts_at)} · {formatMvr(booking.total_amount_laari)}
                  </Caption>
                </GlassSurface>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </Screen>
  );
}
