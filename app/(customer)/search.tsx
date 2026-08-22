import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { GlassSurface } from '../../src/components/GlassSurface';
import { Screen } from '../../src/components/Screen';
import { Skeleton } from '../../src/components/Skeleton';
import { EmptyState } from '../../src/components/states/EmptyState';
import { ErrorState } from '../../src/components/states/ErrorState';
import { Body } from '../../src/components/Typography';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { DEMO_VEHICLES } from '../../src/features/discovery/demoData';
import { FilterBar, type FilterValues } from '../../src/features/discovery/FilterBar';
import { SearchForm, type SearchFormValues } from '../../src/features/discovery/SearchForm';
import { useSearchVehicles } from '../../src/features/discovery/queries';
import { VehicleResultItem } from '../../src/features/discovery/VehicleResultItem';
import { formatMaldivesDateShort, formatMaldivesTime12h } from '../../src/lib/datetime';
import { isDemoMode } from '../../src/lib/env';
import { isSupabaseConfigured } from '../../src/lib/supabase';

/** Mirrors VehicleResultItem's row shape (illustration tile + two text
 * lines + price) so the loading state resembles the final layout instead
 * of a blocking centered spinner. */
function SearchResultsSkeleton() {
  const theme = useTheme();
  return (
    <View testID="search-results-skeleton" style={{ gap: theme.spacing.sm }}>
      {[0, 1, 2].map((i) => (
        <GlassSurface
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <Skeleton width={56} height={56} radius={theme.radii.control} />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Skeleton width="70%" height={17} />
            <Skeleton width="50%" height={13} />
            <Skeleton width="40%" height={13} />
          </View>
        </GlassSurface>
      ))}
    </View>
  );
}

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

  // Same "backend not configured yet" fallback as Explore's discovery
  // section: in demo mode, a missing Supabase config falls back to the
  // fixed demo cards instead of surfacing "Supabase is not configured".
  const showDemoResults = isDemoMode && !isSupabaseConfigured;

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
                  ? `${formatMaldivesDateShort(params.startsAt)}, ${formatMaldivesTime12h(params.startsAt)} → ${formatMaldivesDateShort(params.endsAt)}, ${formatMaldivesTime12h(params.endsAt)}`
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
          showDemoResults ? (
            <FlatList
              testID="search-results"
              data={DEMO_VEHICLES}
              keyExtractor={(item) => item.vehicle_id}
              renderItem={({ item }) => (
                <VehicleResultItem
                  vehicle={item}
                  startsAt={criteria.startsAt}
                  endsAt={criteria.endsAt}
                  demo
                />
              )}
            />
          ) : (
            <>
              {results.isLoading ? <SearchResultsSkeleton /> : null}
              {results.isError ? (
                <ErrorState message={results.error.message} onRetry={() => results.refetch()} />
              ) : null}
              {results.data && results.data.length === 0 ? (
                <EmptyState
                  icon="search-outline"
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
          )
        ) : null}
      </View>
    </Screen>
  );
}
