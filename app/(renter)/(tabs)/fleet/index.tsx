import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, type AlertButton } from 'react-native';

import { Button } from '../../../../src/components/Button';
import { ChipSelect } from '../../../../src/components/ChipSelect';
import { GlassSurface } from '../../../../src/components/GlassSurface';
import { Screen } from '../../../../src/components/Screen';
import { EmptyState } from '../../../../src/components/states/EmptyState';
import { ErrorState } from '../../../../src/components/states/ErrorState';
import { LoadingState } from '../../../../src/components/states/LoadingState';
import { TextField } from '../../../../src/components/TextField';
import { CardTitle, Caption } from '../../../../src/components/Typography';
import { minTouchTarget } from '../../../../src/design-system/tokens';
import { useTheme } from '../../../../src/design-system/ThemeProvider';
import { StatusBadge } from '../../../../src/features/bookings/StatusBadge';
import type { StatusTone } from '../../../../src/features/bookings/status';
import { useCurrentOrganization } from '../../../../src/features/organizations/CurrentOrganizationContext';
import { useVehicles, type Vehicle } from '../../../../src/features/fleet/queries';
import { useVehicleCoverPhotos } from '../../../../src/features/fleet/photos';

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

type StatusFilter = 'all' | Vehicle['status'];

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
];

type SortOption = 'recent' | 'registration' | 'make_model';

const SORT_LABEL: Record<SortOption, string> = {
  recent: 'Recently added',
  registration: 'Registration',
  make_model: 'Make & model',
};

function vehicleLabel(item: Vehicle): string {
  const name = `${item.make ?? ''} ${item.model ?? ''}`.trim();
  return name || item.registration_number;
}

function matchesSearch(item: Vehicle, query: string): boolean {
  if (!query) return true;
  const haystack = [item.registration_number, item.internal_code, item.make, item.model, item.location]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function sortVehicles(vehicles: Vehicle[], sort: SortOption): Vehicle[] {
  const sorted = [...vehicles];
  if (sort === 'registration') {
    sorted.sort((a, b) => a.registration_number.localeCompare(b.registration_number));
  } else if (sort === 'make_model') {
    sorted.sort((a, b) => vehicleLabel(a).localeCompare(vehicleLabel(b)));
  } else {
    sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  return sorted;
}

export default function Fleet() {
  const theme = useTheme();
  const router = useRouter();
  const { organizationId } = useCurrentOrganization();
  const vehicles = useVehicles(organizationId);
  const coverPhotos = useVehicleCoverPhotos(vehicles.data?.map((v) => v.id) ?? []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOption>('recent');

  const visibleVehicles = useMemo(() => {
    if (!vehicles.data) return [];
    const filtered = vehicles.data.filter(
      (v) => (statusFilter === 'all' || v.status === statusFilter) && matchesSearch(v, search),
    );
    return sortVehicles(filtered, sort);
  }, [vehicles.data, search, statusFilter, sort]);

  const openSortMenu = () => {
    // A native UIAlertController action list, the same Alert.alert
    // pattern used elsewhere in this app (DashboardHeader's account menu,
    // More's sign-out confirmation) rather than a custom dropdown or a
    // new native-menu dependency.
    const options: AlertButton[] = [
      ...(Object.keys(SORT_LABEL) as SortOption[]).map((option) => ({
        text: SORT_LABEL[option],
        onPress: () => setSort(option),
      })),
      { text: 'Cancel', style: 'cancel' },
    ];
    Alert.alert('Sort by', undefined, options);
  };

  return (
    <Screen
      title="Fleet"
      titleStyle="large"
      scroll={false}
      headerRight={
        <Pressable
          testID="fleet-sort-button"
          accessibilityRole="button"
          accessibilityLabel={`Sort by ${SORT_LABEL[sort]}`}
          onPress={openSortMenu}
          style={{
            minWidth: minTouchTarget,
            minHeight: minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="swap-vertical-outline" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      }
    >
      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Button testID="fleet-add-vehicle" label="Add vehicle" onPress={() => router.push('/fleet/new')} />
        <TextField
          testID="fleet-search"
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Registration, make, model or location"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ChipSelect
          testID="fleet-status-filter"
          label="Status"
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </View>

      {vehicles.isLoading ? <LoadingState label="Loading fleet…" /> : null}

      {vehicles.isError ? (
        <ErrorState message={vehicles.error.message} onRetry={() => vehicles.refetch()} />
      ) : null}

      {vehicles.data && vehicles.data.length === 0 ? (
        <EmptyState
          icon="bicycle-outline"
          title="No motorcycles yet"
          message="Add your first vehicle to start managing availability and bookings."
          actionLabel="Add vehicle"
          onAction={() => router.push('/fleet/new')}
        />
      ) : null}

      {vehicles.data && vehicles.data.length > 0 && visibleVehicles.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No matches"
          message="No vehicles match this search and filter combination."
        />
      ) : null}

      {visibleVehicles.length > 0 ? (
        <FlatList
          testID="fleet-list"
          data={visibleVehicles}
          keyExtractor={(item) => item.id}
          onRefresh={() => vehicles.refetch()}
          refreshing={vehicles.isRefetching}
          renderItem={({ item }) => (
            <Link href={{ pathname: '/fleet/[vehicleId]', params: { vehicleId: item.id } }} asChild>
              <Pressable
                testID={`fleet-item-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={vehicleLabel(item)}
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
                  {coverPhotos.data?.[item.id] ? (
                    <Image
                      source={{ uri: coverPhotos.data[item.id] }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: theme.radii.control,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.colors.imageOutline,
                      }}
                      contentFit="cover"
                      accessibilityLabel={`${vehicleLabel(item)} photo`}
                    />
                  ) : (
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: theme.radii.control,
                        backgroundColor: theme.colors.glassSurfaceStrong,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="bicycle" size={24} color={theme.colors.textTertiary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <CardTitle>{vehicleLabel(item)}</CardTitle>
                    <Caption>
                      {item.registration_number}
                      {item.location ? ` · ${item.location}` : ''}
                    </Caption>
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
