import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '../../../src/components/Screen';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { ActionPanel } from '../../../src/features/bookings/ActionPanel';
import { BookingTimeline } from '../../../src/features/bookings/BookingTimeline';
import { ConflictWarning } from '../../../src/features/bookings/ConflictWarning';
import {
  useBooking,
  useBookingQuotePreview,
  useVehicleConflicts,
  type BookingQuote,
} from '../../../src/features/bookings/queries';
import { QuotePanel } from '../../../src/features/bookings/QuotePanel';
import { displayBookingStatus } from '../../../src/features/bookings/status';
import { StatusBadge } from '../../../src/features/bookings/StatusBadge';
import { formatMaldivesDateTime } from '../../../src/lib/datetime';

export default function BookingDetail() {
  const theme = useTheme();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const booking = useBooking(bookingId);
  const isPending = booking.data ? ['requested', 'needs_info'].includes(booking.data.status) : false;

  const conflicts = useVehicleConflicts(
    isPending ? booking.data?.vehicle_id : undefined,
    booking.data?.starts_at,
    booking.data?.ends_at,
  );
  const quotePreview = useBookingQuotePreview(
    isPending ? booking.data?.vehicle_id : undefined,
    booking.data?.starts_at,
    booking.data?.ends_at,
  );

  if (booking.isLoading) {
    return <LoadingState label="Loading booking…" />;
  }

  if (booking.isError || !booking.data) {
    return (
      <ErrorState
        message={booking.error?.message ?? 'Booking not found.'}
        onRetry={() => booking.refetch()}
      />
    );
  }

  const b = booking.data;
  const status = displayBookingStatus(b);
  const vehicleName = b.vehicle
    ? `${b.vehicle.make ?? ''} ${b.vehicle.model ?? ''}`.trim() || b.vehicle.registration_number
    : 'Unknown vehicle';
  const frozenQuote = b.quote_snapshot as unknown as BookingQuote | null;

  return (
    <Screen title={vehicleName} description={b.vehicle?.registration_number} scroll>
      <View style={{ gap: theme.spacing.xl }}>
        <StatusBadge label={status.label} tone={status.tone} />

        <View style={{ gap: theme.spacing.xs }} testID="booking-summary">
          <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
            {b.customer?.full_name || b.customer?.email || b.customer?.phone || 'Customer'}
          </Text>
          {b.customer?.phone ? (
            <Text style={{ color: theme.colors.textSecondary }}>{b.customer.phone}</Text>
          ) : null}
          {b.customer?.email ? (
            <Text style={{ color: theme.colors.textSecondary }}>{b.customer.email}</Text>
          ) : null}
          <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>
            {formatMaldivesDateTime(b.starts_at)} → {formatMaldivesDateTime(b.ends_at)}
          </Text>
          {b.notes ? <Text style={{ color: theme.colors.textSecondary }}>Notes: {b.notes}</Text> : null}
        </View>

        {isPending && conflicts.data ? <ConflictWarning conflicts={conflicts.data} /> : null}

        {frozenQuote ? (
          <QuotePanel quote={frozenQuote} frozen />
        ) : isPending && quotePreview.data ? (
          <QuotePanel quote={quotePreview.data} frozen={false} />
        ) : isPending && quotePreview.isError ? (
          <Text style={{ color: theme.colors.warning }} testID="booking-quote-error">
            Can&apos;t estimate a quote yet: {quotePreview.error.message}
          </Text>
        ) : null}

        <ActionPanel booking={b} />

        <BookingTimeline bookingId={b.id} />
      </View>
    </Screen>
  );
}
