import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { GlassSurface } from '../../components/GlassSurface';
import { CardTitle, Caption, PriceText } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { formatMvr } from '../../lib/money';
import type { VehicleSearchResult } from './queries';

function vehicleLabel(vehicle: VehicleSearchResult): string {
  const name = `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim();
  return name || vehicle.registration_number;
}

export function VehicleResultItem({
  vehicle,
  startsAt,
  endsAt,
}: {
  vehicle: VehicleSearchResult;
  startsAt: string;
  endsAt: string;
}) {
  const theme = useTheme();

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
            <CardTitle>{vehicleLabel(vehicle)}</CardTitle>
            <Caption>
              {vehicle.organization_name}
              {vehicle.location ? ` · ${vehicle.location}` : ''}
            </Caption>
            <Caption>
              {vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'}
              {vehicle.category ? ` · ${vehicle.category}` : ''}
            </Caption>
          </View>
          <View style={{ alignItems: 'flex-end', gap: theme.spacing.xs }}>
            {vehicle.daily_rate_laari !== null ? (
              <PriceText>{formatMvr(vehicle.daily_rate_laari)}/day</PriceText>
            ) : vehicle.hourly_rate_laari !== null ? (
              <PriceText>{formatMvr(vehicle.hourly_rate_laari)}/hr</PriceText>
            ) : null}
          </View>
        </GlassSurface>
      </Pressable>
    </Link>
  );
}
