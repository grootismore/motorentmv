import { Link, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/states/EmptyState';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { useTheme } from '../../../src/design-system/ThemeProvider';
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

export default function Fleet() {
  const theme = useTheme();
  const router = useRouter();
  const { organizationId } = useCurrentOrganization();
  const vehicles = useVehicles(organizationId);

  return (
    <Screen title="Fleet" scroll={false}>
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                    {item.make || item.model
                      ? `${item.make ?? ''} ${item.model ?? ''}`.trim()
                      : item.registration_number}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    {item.registration_number}
                  </Text>
                </View>
                <Text style={[styles.status, { color: theme.colors.textSecondary }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </Pressable>
            </Link>
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
  },
});
