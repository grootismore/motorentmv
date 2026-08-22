import { Link, useRouter } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { GlassSurface } from '../../../src/components/GlassSurface';
import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { CardTitle, Caption } from '../../../src/components/Typography';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { StatusBadge } from '../../../src/features/bookings/StatusBadge';
import type { StatusTone } from '../../../src/features/bookings/status';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';
import { useVehicles, type Vehicle } from '../../../src/features/fleet/queries';

const STATUS_LABEL: Record<Vehicle['status'], string> = {
  draft: 'Draft',
  available: 'Available',
  reserved: 'Reserved',
  rented: 'Rented',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
};

const STATUS_TONE: Record<Vehicle['status'], StatusTone> = {
  draft: 'neutral',
  available: 'success',
  reserved: 'info',
  rented: 'info',
  maintenance: 'warning',
  inactive: 'neutral',
};

export default function Fleet() {
  const theme = useTheme();
  const router = useRouter();
  const { organizationId } = useCurrentOrganization();
  const vehicles = useVehicles(organizationId);

  return (
    <Screen title="Fleet" titleStyle="large" scroll={false}>
      <View style={{ marginBottom: theme.spacing.md }}>
        <Button testID="fleet-add-vehicle" label="Add vehicle" onPress={() => router.push('/fleet/new')} />
      </View>

      {vehicles.isLoading ? <LoadingState label="Loading fleet…" /> : null}

      {vehicles.isError ? (
        <ErrorState message={vehicles.error.message} onRetry={() => vehicles.refetch()} />
      ) : null}

      {vehicles.data && vehicles.data.length === 0 ? (
        <EmptyState
          title="No motorcycles yet"
          message="Add your first vehicle to start managing availability and bookings."
          actionLabel="Add vehicle"
          onAction={() => router.push('/fleet/new')}
        />
      ) : null}

      {vehicles.data && vehicles.data.length > 0 ? (
        <FlatList
          testID="fleet-list"
          data={vehicles.data}
          keyExtractor={(item) => item.id}
          onRefresh={() => vehicles.refetch()}
          refreshing={vehicles.isRefetching}
          renderItem={({ item }) => (
            <Link href={{ pathname: '/fleet/[vehicleId]', params: { vehicleId: item.id } }} asChild>
              <Pressable
                testID={`fleet-item-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${item.make ?? ''} ${item.model ?? item.registration_number}`.trim()}
                style={({ pressed }) => ({ marginBottom: theme.spacing.sm, opacity: pressed ? 0.85 : 1 })}
              >
                <GlassSurface
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: theme.spacing.lg,
                    gap: theme.spacing.md,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <CardTitle>
                      {item.make || item.model
                        ? `${item.make ?? ''} ${item.model ?? ''}`.trim()
                        : item.registration_number}
                    </CardTitle>
                    <Caption>{item.registration_number}</Caption>
                  </View>
                  <StatusBadge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
                </GlassSurface>
              </Pressable>
            </Link>
          )}
        />
      ) : null}
    </Screen>
  );
}
