import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
        style={({ pressed }) => [
          styles.row,
          {
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surface,
            marginBottom: theme.spacing.sm,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {vehicleLabel(booking.vehicle)}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            {customerLabel(booking.customer)}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            {formatMaldivesDateTime(booking.starts_at)} → {formatMaldivesDateTime(booking.ends_at)}
          </Text>
          {booking.total_amount_laari !== null ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              {formatMvr(booking.total_amount_laari)}
            </Text>
          ) : null}
        </View>
        <StatusBadge label={status.label} tone={status.tone} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
});
