import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{vehicleLabel(vehicle)}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            {vehicle.organization_name}
            {vehicle.location ? ` · ${vehicle.location}` : ''}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            {vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'}
            {vehicle.category ? ` · ${vehicle.category}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: theme.spacing.xs }}>
          {vehicle.daily_rate_laari !== null ? (
            <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>
              {formatMvr(vehicle.daily_rate_laari)}/day
            </Text>
          ) : vehicle.hourly_rate_laari !== null ? (
            <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>
              {formatMvr(vehicle.hourly_rate_laari)}/hr
            </Text>
          ) : null}
        </View>
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
