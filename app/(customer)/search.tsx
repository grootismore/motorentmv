import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { GlassSurface } from '../../src/components/GlassSurface';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/states/EmptyState';
import { ErrorState } from '../../src/components/states/ErrorState';
import { LoadingState } from '../../src/components/states/LoadingState';
import { Body } from '../../src/components/Typography';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { FilterBar, type FilterValues } from '../../src/features/discovery/FilterBar';
import { SearchForm, type SearchFormValues } from '../../src/features/discovery/SearchForm';
import { useSearchVehicles } from '../../src/features/discovery/queries';
import { VehicleResultItem } from '../../src/features/discovery/VehicleResultItem';
import { formatMaldivesDateTime } from '../../src/lib/datetime';

export default function Search() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ location?: string; startsAt?: string; endsAt?: string }>();
  const [isEditing, setIsEditing] = useState(!params.startsAt || !params.endsAt);
  const [filters, setFilters] = useState<FilterValues>({ transmission: 'any', maxDailyRateLaari: 'any' });

  const criteria =
    params.startsAt && params.endsAt
      ? {
          startsAt: params.startsAt,
          endsAt: params.endsAt,
          location: params.location,
          transmission: filters.transmission === 'any' ? undefined : filters.transmission,
          maxDailyRateLaari:
            filters.maxDailyRateLaari === 'any' ? undefined : Number(filters.maxDailyRateLaari),
        }
      : undefined;

  const results = useSearchVehicles(criteria);

  const handleSearchSubmit = (values: SearchFormValues) => {
    setIsEditing(false);
    router.setParams({
      location: values.location || undefined,
      startsAt: values.startsAtUtc,
      endsAt: values.endsAtUtc,
    });
  };

  return (
    <Screen title="Search" scroll={false}>
      <View style={{ gap: theme.spacing.md, flex: 1 }}>
        {isEditing ? (
          <SearchForm
            initialLocation={params.location}
            initialStartsAtUtc={params.startsAt}
            initialEndsAtUtc={params.endsAt}
            onSubmit={handleSearchSubmit}
          />
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            <GlassSurface
              style={{
                padding: theme.spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Body testID="search-current-range" style={{ flex: 1 }}>
                {params.startsAt && params.endsAt
                  ? `${formatMaldivesDateTime(params.startsAt)} → ${formatMaldivesDateTime(params.endsAt)}`
                  : 'No dates set'}
                {params.location ? ` · ${params.location}` : ''}
              </Body>
              <Button
                testID="search-edit"
                label="Edit"
                variant="secondary"
                onPress={() => setIsEditing(true)}
              />
            </GlassSurface>
            <FilterBar values={filters} onChange={setFilters} />
          </View>
        )}

        {!isEditing && criteria ? (
          <>
            {results.isLoading ? <LoadingState label="Searching…" /> : null}
            {results.isError ? (
              <ErrorState message={results.error.message} onRetry={() => results.refetch()} />
            ) : null}
            {results.data && results.data.length === 0 ? (
              <EmptyState
                title="Nothing available"
                message="No vehicles match these dates and filters. Try widening your search."
              />
            ) : null}
            {results.data && results.data.length > 0 ? (
              <FlatList
                testID="search-results"
                data={results.data}
                keyExtractor={(item) => item.vehicle_id}
                onRefresh={() => results.refetch()}
                refreshing={results.isRefetching}
                renderItem={({ item }) => (
                  <VehicleResultItem vehicle={item} startsAt={criteria.startsAt} endsAt={criteria.endsAt} />
                )}
              />
            ) : null}
          </>
        ) : null}
      </View>
    </Screen>
  );
}
