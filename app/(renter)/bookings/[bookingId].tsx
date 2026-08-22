import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { GroupedSection } from '../../../src/components/GroupedSection';
import { Screen } from '../../../src/components/Screen';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { Body, Caption, CardTitle, SecondaryBody } from '../../../src/components/Typography';
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
import { InspectionSection } from '../../../src/features/inspections/InspectionSection';
import { PaymentLedger } from '../../../src/features/payments/PaymentLedger';
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

        <GroupedSection title="Customer">
          <View style={{ gap: theme.spacing.xs }} testID="booking-summary">
            <CardTitle>
              {b.customer?.full_name || b.customer?.email || b.customer?.phone || 'Customer'}
            </CardTitle>
            {b.customer?.phone ? <SecondaryBody>{b.customer.phone}</SecondaryBody> : null}
            {b.customer?.email ? <SecondaryBody>{b.customer.email}</SecondaryBody> : null}
            <Body style={{ marginTop: theme.spacing.xs }}>
              {formatMaldivesDateTime(b.starts_at)} → {formatMaldivesDateTime(b.ends_at)}
            </Body>
            {b.notes ? <SecondaryBody>Notes: {b.notes}</SecondaryBody> : null}
          </View>
        </GroupedSection>

        {isPending && conflicts.data ? <ConflictWarning conflicts={conflicts.data} /> : null}

        {frozenQuote ? (
          <GroupedSection title="Price breakdown" tone="strong">
            <QuotePanel quote={frozenQuote} frozen />
          </GroupedSection>
        ) : isPending && quotePreview.data ? (
          <GroupedSection title="Price breakdown" tone="strong">
            <QuotePanel quote={quotePreview.data} frozen={false} />
          </GroupedSection>
        ) : isPending && quotePreview.isError ? (
          <Caption testID="booking-quote-error" color={theme.colors.warning}>
            Can&apos;t estimate a quote yet: {quotePreview.error.message}
          </Caption>
        ) : null}

        <ActionPanel booking={b} />

        <InspectionSection
          bookingId={b.id}
          organizationId={b.organization_id}
          bookingStatus={b.status}
          viewerRole="renter"
        />

        <PaymentLedger bookingId={b.id} organizationId={b.organization_id} viewerRole="renter" />

        <BookingTimeline bookingId={b.id} />
      </View>
    </Screen>
  );
}
