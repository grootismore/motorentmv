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

export function BookingListItem({ booking }: { booking: BookingWithDetails }) {
  const theme = useTheme();
  const status = displayBookingStatus(booking);

  return (
    <Link href={{ pathname: '/bookings/[bookingId]', params: { bookingId: booking.id } }} asChild>
      <Pressable
        testID={`booking-item-${booking.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${vehicleLabel(booking.vehicle)}, ${customerLabel(booking.customer)}, ${status.label}`}
        style={({ pressed }) => ({ marginBottom: theme.spacing.sm, opacity: pressed ? 0.85 : 1 })}
      >
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
      </Pressable>
    </Link>
  );
}
