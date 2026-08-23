import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { GlassSurface } from '../../components/GlassSurface';
import { CardTitle, Caption } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { formatMaldivesDateTime } from '../../lib/datetime';
import { formatMvr } from '../../lib/money';
import type { BookingWithDetails } from './queries';
import { displayBookingStatus } from './status';
import { StatusBadge } from './StatusBadge';

function vehicleLabel(vehicle: BookingWithDetails['vehicle']): string {
  if (!vehicle) return 'Unknown vehicle';
  const name = `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim();
  return name ? `${name} (${vehicle.registration_number})` : vehicle.registration_number;
}

function customerLabel(customer: BookingWithDetails['customer']): string {
  return customer?.full_name || customer?.email || customer?.phone || 'Customer';
}

interface BookingListItemProps {
  booking: BookingWithDetails;
  /** True only for EXPO_PUBLIC_DEMO_MODE preview content (e.g. the renter
   * dashboard's empty-fleet demo state) -- disables navigation entirely,
   * the same pattern VehicleResultItem's own `demo` prop uses, since a
   * demo booking id has no real row behind it. */
  demo?: boolean;
}

export function BookingListItem({ booking, demo = false }: BookingListItemProps) {
  const theme = useTheme();
  const status = displayBookingStatus(booking);

  const card = (
    <GlassSurface
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
      }}
    >
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <CardTitle>{vehicleLabel(booking.vehicle)}</CardTitle>
        <Caption>{customerLabel(booking.customer)}</Caption>
        <Caption>
          {formatMaldivesDateTime(booking.starts_at)} → {formatMaldivesDateTime(booking.ends_at)}
        </Caption>
        {booking.total_amount_laari !== null ? (
          <Caption>{formatMvr(booking.total_amount_laari)}</Caption>
        ) : null}
      </View>
      <StatusBadge label={status.label} tone={status.tone} />
    </GlassSurface>
  );

  if (demo) {
    return (
      <View
        testID={`booking-item-${booking.id}`}
        accessibilityLabel={`${vehicleLabel(booking.vehicle)}, ${customerLabel(booking.customer)}, ${status.label}`}
        style={{ marginBottom: theme.spacing.sm }}
      >
        {card}
      </View>
    );
  }

  return (
    <Link href={{ pathname: '/bookings/[bookingId]', params: { bookingId: booking.id } }} asChild>
      <Pressable
        testID={`booking-item-${booking.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${vehicleLabel(booking.vehicle)}, ${customerLabel(booking.customer)}, ${status.label}`}
        style={({ pressed }) => ({ marginBottom: theme.spacing.sm, opacity: pressed ? 0.85 : 1 })}
      >
        {card}
      </Pressable>
    </Link>
  );
}
