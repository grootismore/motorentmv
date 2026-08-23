import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { DateRangeSelector } from '../../../src/components/DateRangeSelector';
import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { Body, Caption } from '../../../src/components/Typography';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { ConflictWarning } from '../../../src/features/bookings/ConflictWarning';
import { QuotePanel } from '../../../src/features/bookings/QuotePanel';
import {
  useBookingQuotePreview,
  useCreateBookingForCustomer,
  useOrgCustomers,
  useVehicleConflicts,
} from '../../../src/features/bookings/queries';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';
import { useVehicles } from '../../../src/features/fleet/queries';

function vehicleLabel(v: { make: string | null; model: string | null; registration_number: string }): string {
  const name = `${v.make ?? ''} ${v.model ?? ''}`.trim();
  return name ? `${name} (${v.registration_number})` : v.registration_number;
}

function customerLabel(c: { full_name: string | null; email: string | null; phone: string | null }): string {
  return c.full_name || c.email || c.phone || 'Customer';
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export default function CreateBooking() {
  const theme = useTheme();
  const router = useRouter();
  const { organizationId } = useCurrentOrganization();

  const vehicles = useVehicles(organizationId);
  const customers = useOrgCustomers(organizationId);
  const createBooking = useCreateBookingForCustomer();

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [startsAtUtc, setStartsAtUtc] = useState(() => new Date(Date.now() + ONE_HOUR_MS).toISOString());
  const [endsAtUtc, setEndsAtUtc] = useState(() => new Date(Date.now() + 25 * ONE_HOUR_MS).toISOString());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const quote = useBookingQuotePreview(vehicleId ?? undefined, startsAtUtc, endsAtUtc);
  const conflicts = useVehicleConflicts(vehicleId ?? undefined, startsAtUtc, endsAtUtc);

  if (vehicles.isLoading || customers.isLoading) {
    return (
      <Screen title="Create booking">
        <LoadingState label="Loading vehicles and customers…" />
      </Screen>
    );
  }

  if (vehicles.isError || customers.isError) {
    return (
      <Screen title="Create booking">
        <ErrorState
          message={vehicles.error?.message ?? customers.error?.message}
          onRetry={() => {
            void vehicles.refetch();
            void customers.refetch();
          }}
        />
      </Screen>
    );
  }

  const availableVehicles = (vehicles.data ?? []).filter((v) => v.status === 'available');
  const customerList = customers.data ?? [];

  if (availableVehicles.length === 0) {
    return (
      <Screen title="Create booking">
        <EmptyState
          icon="bicycle-outline"
          title="No available vehicles"
          message="Every vehicle is currently reserved, rented, or in maintenance."
        />
      </Screen>
    );
  }

  if (customerList.length === 0) {
    return (
      <Screen title="Create booking">
        <EmptyState
          icon="person-outline"
          title="No existing customers yet"
          message="A booking can only be created here for a customer who has booked with this business before — for privacy reasons, staff can't look up a customer who hasn't. Once someone submits their first request through Explore/Search, they'll appear here."
        />
      </Screen>
    );
  }

  const hasConflict = (conflicts.data?.length ?? 0) > 0;
  const canSubmit = Boolean(vehicleId && customerId) && !hasConflict && !createBooking.isPending;

  const handleSubmit = async () => {
    if (!vehicleId || !customerId) return;
    setSubmitError(null);
    try {
      const booking = await createBooking.mutateAsync({
        organizationId,
        vehicleId,
        customerId,
        startsAt: startsAtUtc,
        endsAt: endsAtUtc,
      });
      router.replace({ pathname: '/bookings/[bookingId]', params: { bookingId: booking.id } });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not create the booking. Please try again.',
      );
    }
  };

  return (
    <Screen title="Create booking" scroll>
      <View style={{ gap: theme.spacing.lg }}>
        <ChipSelect
          testID="new-booking-vehicle"
          label="Vehicle"
          options={availableVehicles.map((v) => ({ value: v.id, label: vehicleLabel(v) }))}
          value={vehicleId ?? ''}
          onChange={setVehicleId}
        />

        <ChipSelect
          testID="new-booking-customer"
          label="Customer"
          options={customerList.map((c) => ({ value: c.id, label: customerLabel(c) }))}
          value={customerId ?? ''}
          onChange={setCustomerId}
        />

        <DateRangeSelector
          testIDPrefix="new-booking"
          startsAtUtc={startsAtUtc}
          endsAtUtc={endsAtUtc}
          onChange={({ startsAtUtc: nextStart, endsAtUtc: nextEnd }) => {
            setStartsAtUtc(nextStart);
            setEndsAtUtc(nextEnd);
          }}
        />

        {vehicleId && conflicts.data ? <ConflictWarning conflicts={conflicts.data} /> : null}

        {vehicleId && quote.data ? <QuotePanel quote={quote.data} frozen={false} /> : null}
        {vehicleId && quote.isError ? (
          <Caption color={theme.colors.destructive}>
            Couldn&apos;t load a quote for this vehicle/date range.
          </Caption>
        ) : null}

        {submitError ? (
          <Body testID="new-booking-error" color={theme.colors.destructive}>
            {submitError}
          </Body>
        ) : null}

        <Button
          testID="new-booking-submit"
          label="Create booking"
          loading={createBooking.isPending}
          disabled={!canSubmit}
          onPress={() => {
            void handleSubmit();
          }}
        />
      </View>
    </Screen>
  );
}
