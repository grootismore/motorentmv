import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { Screen } from '../../../src/components/Screen';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { BookingTimeline } from '../../../src/features/bookings/BookingTimeline';
import { useBooking, useCancelBooking, type BookingQuote } from '../../../src/features/bookings/queries';
import { QuotePanel } from '../../../src/features/bookings/QuotePanel';
import { displayBookingStatus } from '../../../src/features/bookings/status';
import { StatusBadge } from '../../../src/features/bookings/StatusBadge';
import { InspectionSection } from '../../../src/features/inspections/InspectionSection';
import { PaymentLedger } from '../../../src/features/payments/PaymentLedger';
import { formatMaldivesDateTime } from '../../../src/lib/datetime';

const CANCELLABLE_STATUSES = ['draft', 'requested', 'needs_info'];

export default function CustomerBookingDetail() {
  const theme = useTheme();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const booking = useBooking(bookingId);
  const cancel = useCancelBooking();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

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
  const canCancel = CANCELLABLE_STATUSES.includes(b.status);

  return (
    <Screen title={vehicleName} description={b.vehicle?.registration_number} scroll>
      <View style={{ gap: theme.spacing.xl }}>
        <StatusBadge label={status.label} tone={status.tone} />

        <View style={{ gap: theme.spacing.xs }} testID="booking-summary">
          <Text style={{ color: theme.colors.textSecondary }}>
            {formatMaldivesDateTime(b.starts_at)} → {formatMaldivesDateTime(b.ends_at)}
          </Text>
          {b.notes ? <Text style={{ color: theme.colors.textSecondary }}>Notes: {b.notes}</Text> : null}
        </View>

        {frozenQuote ? <QuotePanel quote={frozenQuote} frozen /> : null}

        {canCancel ? (
          <View style={{ gap: theme.spacing.sm }}>
            {errorMessage ? (
              <Text
                style={{ color: theme.colors.danger }}
                accessibilityRole="alert"
                testID="cancel-booking-error"
              >
                {errorMessage}
              </Text>
            ) : null}
            <Button
              testID="cancel-booking"
              label="Cancel request"
              variant="danger"
              loading={cancel.isPending}
              onPress={() => {
                setErrorMessage(undefined);
                cancel.mutate({ bookingId: b.id }, { onError: (error) => setErrorMessage(error.message) });
              }}
            />
          </View>
        ) : null}

        <InspectionSection
          bookingId={b.id}
          organizationId={b.organization_id}
          bookingStatus={b.status}
          viewerRole="customer"
        />

        <PaymentLedger bookingId={b.id} organizationId={b.organization_id} viewerRole="customer" />

        <BookingTimeline bookingId={b.id} />
      </View>
    </Screen>
  );
}
