import { Image } from 'expo-image';
import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { Screen } from '../../../src/components/Screen';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import {
  useListingQuote,
  useVehicleBookable,
  useVehicleListing,
} from '../../../src/features/discovery/queries';
import { useVehiclePhotos } from '../../../src/features/fleet/photos';
import { QuotePanel } from '../../../src/features/bookings/QuotePanel';
import { formatMaldivesDateTime } from '../../../src/lib/datetime';

export default function ListingDetail() {
  const theme = useTheme();
  const { vehicleId, startsAt, endsAt } = useLocalSearchParams<{
    vehicleId: string;
    startsAt: string;
    endsAt: string;
  }>();

  const listing = useVehicleListing(vehicleId);
  const photos = useVehiclePhotos(vehicleId);
  const quote = useListingQuote(vehicleId, startsAt, endsAt);
  const bookable = useVehicleBookable(vehicleId, startsAt, endsAt);

  if (listing.isLoading) {
    return <LoadingState label="Loading listing…" />;
  }

  if (listing.isError) {
    return <ErrorState message={listing.error.message} onRetry={() => listing.refetch()} />;
  }

  if (!listing.data) {
    return <ErrorState title="Listing not found" message="This vehicle is no longer available." />;
  }

  const vehicle = listing.data;
  const vehicleName = `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || vehicle.registration_number;
  const isFresh = bookable.data === true;
  const isStale = bookable.data === false;

  return (
    <Screen title={vehicleName} description={vehicle.organization_name} scroll>
      <View style={{ gap: theme.spacing.xl }}>
        {photos.data && photos.data.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} testID="listing-photos">
            {photos.data.map((photo) =>
              photo.signedUrl ? (
                <Image
                  key={photo.id}
                  source={{ uri: photo.signedUrl }}
                  style={{
                    width: 240,
                    height: 180,
                    borderRadius: theme.radii.md,
                    marginRight: theme.spacing.sm,
                  }}
                  contentFit="cover"
                  accessibilityLabel={`${vehicleName} photo`}
                />
              ) : null,
            )}
          </ScrollView>
        ) : null}

        <View style={{ gap: theme.spacing.xs }} testID="listing-details">
          <Text
            style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: theme.typography.size.lg }}
          >
            {vehicleName}
          </Text>
          <Text style={{ color: theme.colors.textSecondary }}>
            {vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'}
            {vehicle.category ? ` · ${vehicle.category}` : ''}
            {vehicle.color ? ` · ${vehicle.color}` : ''}
          </Text>
          {vehicle.location ? (
            <Text style={{ color: theme.colors.textSecondary }}>{vehicle.location}</Text>
          ) : null}
          {vehicle.included_accessories.length > 0 ? (
            <Text style={{ color: theme.colors.textSecondary }}>
              Includes: {vehicle.included_accessories.join(', ')}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>Your dates</Text>
          <Text style={{ color: theme.colors.textSecondary }}>
            {formatMaldivesDateTime(startsAt)} → {formatMaldivesDateTime(endsAt)}
          </Text>
        </View>

        {quote.isLoading ? <LoadingState label="Calculating price…" /> : null}
        {quote.isError ? (
          <Text style={{ color: theme.colors.warning }} testID="listing-quote-error">
            Can&apos;t calculate a price for these dates: {quote.error.message}
          </Text>
        ) : null}
        {quote.data ? <QuotePanel quote={quote.data} frozen={false} /> : null}

        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} testID="listing-payment-notice">
          You won&apos;t be charged now — this sends a request to the renter, who will accept or decline it.
          Payment happens separately, later, and is never collected through this app at request time.
        </Text>

        {isStale ? (
          <Text
            style={{ color: theme.colors.danger }}
            testID="listing-stale-warning"
            accessibilityRole="alert"
          >
            This vehicle is no longer available for these exact dates. Go back and try a different range.
          </Text>
        ) : null}

        <Link href={{ pathname: '/checkout/[vehicleId]', params: { vehicleId, startsAt, endsAt } }} asChild>
          <Button testID="listing-request-to-book" label="Request to book" disabled={!isFresh} />
        </Link>
      </View>
    </Screen>
  );
}
