import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { GlassSurface } from '../../components/GlassSurface';
import { CardTitle, Caption, Label, LargeTitle, PriceText } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { useVehiclePhotos } from '../fleet/photos';
import { formatMvr } from '../../lib/money';
import type { VehicleSearchResult } from './queries';

function vehicleLabel(vehicle: VehicleSearchResult): string {
  const name = `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim();
  return name || vehicle.registration_number;
}

/**
 * A flat vector illustration tile, shown while a real photo isn't
 * available: no photo uploaded yet, still loading, or (see
 * VehiclePhoto below) the viewer is browsing anonymously --
 * vehicle_photos_select (20260821130001_vehicle_photo_storage.sql) is
 * `to authenticated` only, so an anon customer's signed-URL fetch would
 * simply fail. Rather than touch that RLS policy (out of scope) or fetch
 * a random/remote stock photo (never in production code), this is
 * honest about what it is, never pretending to be the specific
 * vehicle's real image.
 */
function VehicleIllustration({ size }: { size: 'row' | 'hero' }) {
  const theme = useTheme();
  const height = size === 'hero' ? 140 : 56;

  return (
    <LinearGradient
      colors={[theme.colors.lagoonPrimary, theme.colors.oceanDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        height,
        width: size === 'hero' ? '100%' : 56,
        borderRadius: size === 'hero' ? theme.radii.card : theme.radii.control,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="bicycle" size={size === 'hero' ? 48 : 26} color={theme.colors.oceanForeground} />
    </LinearGradient>
  );
}

/**
 * The vehicle's own first uploaded photo when one exists and the viewer
 * is signed in (any authenticated customer can read an available
 * vehicle's photos -- see vehicle_photos_select's own comment above),
 * falling back to VehicleIllustration otherwise. `signedIn` gates the
 * fetch itself, not just the render, so an anonymous browsing session
 * never issues a request RLS is only going to reject.
 */
function VehiclePhoto({
  vehicleId,
  signedIn,
  size,
}: {
  vehicleId: string;
  signedIn: boolean;
  size: 'row' | 'hero';
}) {
  const theme = useTheme();
  const photos = useVehiclePhotos(signedIn ? vehicleId : undefined);
  const coverUrl = photos.data?.[0]?.signedUrl;
  const height = size === 'hero' ? 140 : 56;

  if (!coverUrl) return <VehicleIllustration size={size} />;

  return (
    <Image
      source={{ uri: coverUrl }}
      style={{
        height,
        width: size === 'hero' ? '100%' : 56,
        borderRadius: size === 'hero' ? theme.radii.card : theme.radii.control,
      }}
      contentFit="cover"
      accessibilityLabel="Vehicle photo"
    />
  );
}

interface VehicleResultItemProps {
  vehicle: VehicleSearchResult;
  startsAt: string;
  endsAt: string;
  /** 'row' (default) for the Search results list; 'hero' for Explore's
   * discovery section — same data, same destination, a bigger card. */
  variant?: 'row' | 'hero';
  /** EXPO_PUBLIC_DEMO_MODE preview content only (src/lib/env.ts,
   * src/features/discovery/demoData.ts) — renders a "Demo" badge and
   * never navigates, since a demo vehicle_id has no real listing behind
   * it. Never set for real search results. */
  demo?: boolean;
  /** Whether the browsing customer is signed in — gates fetching the
   * vehicle's real photo (see VehiclePhoto above). Defaults to false so
   * anonymous browsing (this app's default) never issues a request RLS
   * would reject. */
  signedIn?: boolean;
}

export function VehicleResultItem({
  vehicle,
  startsAt,
  endsAt,
  variant = 'row',
  demo = false,
  signedIn = false,
}: VehicleResultItemProps) {
  const theme = useTheme();

  const details = (
    <>
      <Caption>
        {vehicle.organization_name}
        {vehicle.location ? ` · ${vehicle.location}` : ''}
      </Caption>
      <Caption>
        {vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'}
        {vehicle.category ? ` · ${vehicle.category}` : ''}
      </Caption>
    </>
  );

  const price =
    vehicle.daily_rate_laari !== null ? (
      <PriceText>{formatMvr(vehicle.daily_rate_laari)}/day</PriceText>
    ) : vehicle.hourly_rate_laari !== null ? (
      <PriceText>{formatMvr(vehicle.hourly_rate_laari)}/hr</PriceText>
    ) : null;

  const demoBadge = demo ? (
    <View
      style={{
        position: 'absolute',
        top: theme.spacing.sm,
        insetInlineEnd: theme.spacing.sm,
        backgroundColor: theme.colors.warning,
        borderRadius: theme.radii.full,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Label color={theme.colors.textPrimary} style={{ fontWeight: '700' }}>
        Demo
      </Label>
    </View>
  ) : null;

  // search_available_vehicles() (20260821150001_customer_discovery.sql)
  // only ever returns vehicles that are bookable for the requested window
  // -- so every real result is, by construction, "Available" for these
  // dates. This badge surfaces that server-guaranteed fact rather than
  // deriving its own availability check.
  const availabilityBadge = (
    <View
      style={{
        position: 'absolute',
        top: theme.spacing.sm,
        insetInlineStart: theme.spacing.sm,
        backgroundColor: theme.colors.success,
        borderRadius: theme.radii.full,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Label color={theme.colors.textInverse} style={{ fontWeight: '700' }}>
        Available
      </Label>
    </View>
  );

  const card =
    variant === 'hero' ? (
      <GlassSurface tone="strong" style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <View>
          {demo ? (
            <VehicleIllustration size="hero" />
          ) : (
            <VehiclePhoto vehicleId={vehicle.vehicle_id} signedIn={signedIn} size="hero" />
          )}
          {demo ? demoBadge : availabilityBadge}
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: theme.spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <LargeTitle style={{ fontSize: 20, lineHeight: 25 }}>{vehicleLabel(vehicle)}</LargeTitle>
            {details}
          </View>
          {price}
        </View>
      </GlassSurface>
    ) : (
      <GlassSurface
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        }}
      >
        {demo ? (
          <VehicleIllustration size="row" />
        ) : (
          <VehiclePhoto vehicleId={vehicle.vehicle_id} signedIn={signedIn} size="row" />
        )}
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <CardTitle>{vehicleLabel(vehicle)}</CardTitle>
          {details}
        </View>
        <View style={{ alignItems: 'flex-end', gap: theme.spacing.xs }}>{price}</View>
      </GlassSurface>
    );

  if (demo) {
    return (
      <View
        testID={`vehicle-result-${vehicle.vehicle_id}`}
        accessibilityLabel={`${vehicleLabel(vehicle)}, demo preview, not bookable`}
        style={{ marginBottom: theme.spacing.sm }}
      >
        {card}
      </View>
    );
  }

  return (
    <Link
      href={{
        pathname: '/listing/[vehicleId]',
        params: { vehicleId: vehicle.vehicle_id, startsAt, endsAt },
      }}
      asChild
    >
      <Pressable
        testID={`vehicle-result-${vehicle.vehicle_id}`}
        accessibilityRole="button"
        accessibilityLabel={`${vehicleLabel(vehicle)}, ${vehicle.organization_name}`}
        style={({ pressed }) => ({ marginBottom: theme.spacing.sm, opacity: pressed ? 0.85 : 1 })}
      >
        {card}
      </Pressable>
    </Link>
  );
}
