import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { Screen } from '../../../src/components/Screen';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { useAuth } from '../../../src/features/auth/AuthProvider';
import { InlineAuthGate } from '../../../src/features/auth/InlineAuthGate';
import type { BookingQuote } from '../../../src/features/bookings/queries';
import { QuotePanel } from '../../../src/features/bookings/QuotePanel';
import { useSubmitBookingRequest } from '../../../src/features/checkout/queries';
import { RiderDetailsForm, type RiderDetailsValues } from '../../../src/features/checkout/RiderDetailsForm';
import type { VehicleListing } from '../../../src/features/discovery/queries';
import {
  useListingQuote,
  useVehicleBookable,
  useVehicleListing,
} from '../../../src/features/discovery/queries';
import { useMyProfile } from '../../../src/features/profile/queries';
import { formatMaldivesDateTime } from '../../../src/lib/datetime';

interface CheckoutFormProps {
  vehicle: VehicleListing;
  startsAt: string;
  endsAt: string;
  customerId: string;
  quote: BookingQuote | undefined;
  isBookable: boolean | undefined;
  initialFullName: string;
  initialPhone: string;
}

/**
 * Owns rider-details edit state, initialized once from whatever profile
 * data (if any) had already loaded by the time this mounts — a plain
 * lazy useState initializer, not a value synced in from a later-arriving
 * query via an effect or a render-phase setState. The parent keys this
 * component by profile.data?.id specifically so that if the profile
 * finishes loading *after* first mount, React remounts this with the
 * now-available initial values instead of the customer's own typing
 * being silently overwritten later or racing a same-render state update.
 */
function CheckoutForm({
  vehicle,
  startsAt,
  endsAt,
  customerId,
  quote,
  isBookable,
  initialFullName,
  initialPhone,
}: CheckoutFormProps) {
  const theme = useTheme();
  const router = useRouter();
  const submit = useSubmitBookingRequest();
  const [riderDetails, setRiderDetails] = useState<RiderDetailsValues>({
    fullName: initialFullName,
    phone: initialPhone,
  });
  const [submitError, setSubmitError] = useState<string | undefined>();

  const handleSubmit = () => {
    if (!riderDetails.fullName.trim()) {
      setSubmitError('Enter your full name.');
      return;
    }
    // A courtesy freshness re-check, not the security boundary (see
    // is_vehicle_bookable's own comment) — the vehicle could have been
    // booked by someone else in the time since this screen loaded.
    // request_booking() itself still allows overlapping *requests* to
    // coexist (only accept_booking is exclusive), so this is purely
    // about not letting a customer submit against dates that already
    // show as unavailable if they've simply been sitting on the page.
    if (isBookable === false) {
      setSubmitError('This vehicle is no longer available for these dates. Go back and search again.');
      return;
    }
    setSubmitError(undefined);
    submit.mutate(
      {
        organizationId: vehicle.organization_id,
        vehicleId: vehicle.vehicle_id,
        customerId,
        startsAt,
        endsAt,
      },
      {
        onSuccess: (booking) => {
          router.replace({ pathname: '/bookings/[bookingId]', params: { bookingId: booking.id } });
        },
        onError: (error) => setSubmitError(error.message),
      },
    );
  };

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <View style={{ gap: theme.spacing.xs }}>
        <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>Dates</Text>
        <Text style={{ color: theme.colors.textSecondary }}>
          {formatMaldivesDateTime(startsAt)} → {formatMaldivesDateTime(endsAt)}
        </Text>
      </View>

      <RiderDetailsForm values={riderDetails} onChange={setRiderDetails} />

      {quote ? <QuotePanel quote={quote} frozen={false} /> : null}

      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} testID="checkout-payment-notice">
        This submits a request only — you won&apos;t be charged now. The renter reviews it and either accepts
        or declines; payment is handled separately later, outside this submission.
      </Text>

      {submitError ? (
        <Text style={{ color: theme.colors.danger }} accessibilityRole="alert" testID="checkout-error">
          {submitError}
        </Text>
      ) : null}

      <Button
        testID="checkout-submit"
        label={submit.isError ? 'Try again' : 'Submit request'}
        onPress={handleSubmit}
        loading={submit.isPending}
      />
    </View>
  );
}

export default function Checkout() {
  const { session } = useAuth();
  const { vehicleId, startsAt, endsAt } = useLocalSearchParams<{
    vehicleId: string;
    startsAt: string;
    endsAt: string;
  }>();

  const listing = useVehicleListing(vehicleId);
  const quote = useListingQuote(vehicleId, startsAt, endsAt);
  const bookable = useVehicleBookable(vehicleId, startsAt, endsAt);
  const profile = useMyProfile(session?.user.id);

  if (session === undefined || listing.isLoading) {
    return <LoadingState label="Loading…" />;
  }

  if (listing.isError || !listing.data) {
    return (
      <ErrorState
        title="Listing not found"
        message={listing.error?.message ?? 'This vehicle is no longer available.'}
      />
    );
  }

  const vehicle = listing.data;
  const vehicleName = `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || vehicle.registration_number;

  if (session === null) {
    return (
      <Screen title="Request to book" description={vehicleName} scroll>
        <InlineAuthGate description="Sign in to submit your booking request — you won't be charged yet." />
      </Screen>
    );
  }

  return (
    <Screen title="Request to book" description={vehicleName} scroll>
      <CheckoutForm
        key={profile.data?.id ?? 'prefill-pending'}
        vehicle={vehicle}
        startsAt={startsAt}
        endsAt={endsAt}
        customerId={session.user.id}
        quote={quote.data}
        isBookable={bookable.data}
        initialFullName={profile.data?.full_name ?? ''}
        initialPhone={profile.data?.phone ?? ''}
      />
    </Screen>
  );
}
