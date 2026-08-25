import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { GlassSurface } from '../../../src/components/GlassSurface';
import { GroupedSection } from '../../../src/components/GroupedSection';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { CardTitle, Caption, Label, SecondaryBody } from '../../../src/components/Typography';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { QuotePanel } from '../../../src/features/bookings/QuotePanel';
import {
  useListingQuote,
  useVehicleBookable,
  useVehicleListing,
} from '../../../src/features/discovery/queries';
import { useVehiclePhotos } from '../../../src/features/fleet/photos';
import { formatMaldivesDateTime } from '../../../src/lib/datetime';

/** Only real vehicle attributes appear here (transmission, category,
 * color, year) — the Ocean Glass reference shows illustrative chips like
 * "160cc"/"2 Seats"/"Petrol" that this schema has no field for (no
 * engine-size, seat-count or fuel-type column exists on vehicles). Rather
 * than invent values with no backing data, this only surfaces what's real. */
function FeatureChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.radii.chip,
        backgroundColor: theme.colors.glassSurfaceStrong,
      }}
    >
      <Ionicons name={icon} size={14} color={theme.colors.textSecondary} />
      <Label color={theme.colors.textSecondary}>{label}</Label>
    </View>
  );
}

export default function ListingDetail() {
  const theme = useTheme();
  const router = useRouter();
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.pearlBackground }}
      edges={['left', 'right']}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Edge-to-edge hero image with a floating circular back control —
            share/favorite controls from the reference are intentionally
            omitted: there's no sharing or favoriting feature in this app,
            and a decorative button that does nothing would be misleading. */}
        <View>
          {photos.data && photos.data.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              testID="listing-photos"
            >
              {photos.data.map((photo) =>
                photo.signedUrl ? (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.signedUrl }}
                    style={styles.heroImage}
                    contentFit="cover"
                    accessibilityLabel={`${vehicleName} photo`}
                  />
                ) : null,
              )}
            </ScrollView>
          ) : (
            <View style={[styles.heroImage, { backgroundColor: theme.colors.glassBorder }]} />
          )}
          <SafeAreaView style={StyleSheet.absoluteFill} edges={['top']} pointerEvents="box-none">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={{
                margin: theme.spacing.md,
                width: 36,
                height: 36,
                borderRadius: theme.radii.full,
                backgroundColor: 'rgba(15,37,64,0.45)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.textInverse} />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={{ padding: 20, gap: theme.spacing.xl }}>
          <View style={{ gap: theme.spacing.xs }} testID="listing-details">
            <CardTitle style={{ fontSize: 22 }}>{vehicleName}</CardTitle>
            <SecondaryBody>{vehicle.organization_name}</SecondaryBody>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing.sm,
                marginTop: theme.spacing.xs,
              }}
            >
              <FeatureChip
                icon="settings-outline"
                label={vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'}
              />
              {vehicle.category ? <FeatureChip icon="pricetag-outline" label={vehicle.category} /> : null}
              {vehicle.color ? <FeatureChip icon="color-palette-outline" label={vehicle.color} /> : null}
              {vehicle.year ? <FeatureChip icon="calendar-outline" label={String(vehicle.year)} /> : null}
            </View>
            {vehicle.included_accessories.length > 0 ? (
              <Caption>Includes: {vehicle.included_accessories.join(', ')}</Caption>
            ) : null}
          </View>

          {vehicle.location ? (
            <GroupedSection title="Pick-up location">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Ionicons name="location-outline" size={18} color={theme.colors.lagoonPrimary} />
                <SecondaryBody>{vehicle.location}</SecondaryBody>
              </View>
            </GroupedSection>
          ) : null}

          <GroupedSection title="Your dates">
            <SecondaryBody>
              {formatMaldivesDateTime(startsAt)} → {formatMaldivesDateTime(endsAt)}
            </SecondaryBody>
          </GroupedSection>

          <GroupedSection title="Price breakdown" tone="strong">
            {quote.isLoading ? <LoadingState label="Calculating price…" /> : null}
            {quote.isError ? (
              <Caption testID="listing-quote-error" color={theme.colors.warning}>
                Can&apos;t calculate a price for these dates: {quote.error.message}
              </Caption>
            ) : null}
            {quote.data ? <QuotePanel quote={quote.data} frozen={false} /> : null}
          </GroupedSection>

          <GlassSurface
            style={{
              padding: theme.spacing.md,
              flexDirection: 'row',
              gap: theme.spacing.sm,
              alignItems: 'flex-start',
            }}
          >
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.information} />
            <Caption testID="listing-payment-notice" style={{ flex: 1 }}>
              You won&apos;t be charged now — this sends a request to the renter, who will accept or decline
              it. Payment happens separately, later, and is never collected through this app at request time.
            </Caption>
          </GlassSurface>

          {isStale ? (
            <Caption
              testID="listing-stale-warning"
              accessibilityRole="alert"
              color={theme.colors.destructive}
            >
              This vehicle is no longer available for these exact dates. Go back and try a different range.
            </Caption>
          ) : null}
        </View>
      </ScrollView>

      {/* Flat sticky action bar — never a bulky/inflated button. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <GlassSurface
          tone="strong"
          style={{
            borderRadius: 0,
            borderLeftWidth: 0,
            borderRightWidth: 0,
            borderBottomWidth: 0,
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.xxl,
          }}
        >
          <Link href={{ pathname: '/checkout/[vehicleId]', params: { vehicleId, startsAt, endsAt } }} asChild>
            <Button testID="listing-request-to-book" label="Request booking" disabled={!isFresh} />
          </Link>
        </GlassSurface>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
});
