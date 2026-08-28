import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '../../../src/components/GlassSurface';
import { Skeleton } from '../../../src/components/Skeleton';
import { EmptyState } from '../../../src/components/states/EmptyState';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { Body, Caption, LargeTitle, SectionTitle } from '../../../src/components/Typography';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { useAuth } from '../../../src/features/auth/AuthProvider';
import { DEMO_VEHICLES } from '../../../src/features/discovery/demoData';
import { SearchForm, type SearchFormValues } from '../../../src/features/discovery/SearchForm';
import { useSearchVehicles } from '../../../src/features/discovery/queries';
import { VehicleResultItem } from '../../../src/features/discovery/VehicleResultItem';
import { useUnreadNotificationCount } from '../../../src/features/notifications/queries';
import { isDemoMode } from '../../../src/lib/env';
import { isSupabaseConfigured } from '../../../src/lib/supabase';

/**
 * The one screen that bypasses the shared Screen shell: the Ocean Glass
 * reference gives Explore a full-bleed ocean-gradient hero header (title
 * + search panel both sitting on it), unlike every other screen's flat
 * pearl background + compact nav title. Every other customer/renter
 * screen still uses Screen.
 *
 * Text/icons on the hero use `oceanForeground`, not `textInverse` --
 * textInverse is the inverse of body text for scheme-adaptive accent
 * surfaces (e.g. a button label on lagoonPrimary) and flips to near-black
 * in dark mode; the ocean gradient itself never lightens with scheme, so
 * textInverse produced unreadable near-invisible text here on a physical
 * device in dark mode. oceanForeground is always light, in both schemes.
 */
export default function Explore() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const unreadCount = useUnreadNotificationCount(session?.user.id);

  // A fixed rolling window, independent of whatever dates a customer
  // later types into the search form above -- this section answers
  // "what's generally available soon", not "what matches my exact trip".
  // A lazy useState initializer, not useMemo: reading the clock (Date.now)
  // is an impure operation the React Compiler's purity check rejects
  // inside a render-phase useMemo factory, same class of issue as
  // Skeleton.tsx's Animated.Value (see that component's own comment).
  const [discoveryCriteria] = useState(() => ({
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  }));
  const discovery = useSearchVehicles(discoveryCriteria);

  const handleSubmit = (values: SearchFormValues) => {
    router.push({
      pathname: '/search',
      params: {
        location: values.location || undefined,
        startsAt: values.startsAtUtc,
        endsAt: values.endsAtUtc,
      },
    });
  };

  // Supabase not being configured at all (no backend to query against yet)
  // is a distinct condition from a real query failure -- in demo mode it
  // falls back the same way "the real search returned nothing" does,
  // rather than surfacing the "Supabase is not configured" ErrorState.
  const showDemoFallback =
    isDemoMode &&
    (!isSupabaseConfigured || (!discovery.isLoading && !discovery.isError && discovery.data?.length === 0));
  const showDiscoveryError = discovery.isError && !(isDemoMode && !isSupabaseConfigured);

  // Real count for the section subhead below -- undefined (not 0) while
  // loading/erroring, so the subhead simply doesn't render rather than
  // flashing "0 available" before the first fetch resolves.
  const availableCount =
    !discovery.isLoading && !discovery.isError && (discovery.data?.length ?? 0) > 0
      ? discovery.data?.length
      : showDemoFallback
        ? DEMO_VEHICLES.length
        : undefined;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.pearlBackground }}
      edges={['top', 'left', 'right']}
    >
      {/* 32pt: same scroll-end breathing room as src/components/Screen.tsx
          -- this screen bypasses that shared shell (see the doc comment
          above), so it matches the same value directly. The native tab
          bar reserves its own space, so this isn't tab-bar clearance. */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={discovery.isRefetching} onRefresh={() => discovery.refetch()} />
        }
      >
        <LinearGradient
          colors={[theme.colors.oceanBackground, theme.colors.oceanDeep]}
          style={{
            paddingHorizontal: 20,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.xxl,
            borderBottomLeftRadius: theme.radii.sheet,
            borderBottomRightRadius: theme.radii.sheet,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.xl,
            }}
          >
            <Body color={theme.colors.oceanForeground} style={{ fontWeight: '700' }}>
              RideFinder
            </Body>
            <Link href="/notifications" asChild>
              <Pressable
                testID="explore-notifications-button"
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                accessibilityHint={
                  (unreadCount.data ?? 0) > 0 ? `${unreadCount.data} unread` : 'No unread notifications'
                }
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: theme.radii.full,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="notifications-outline" size={18} color={theme.colors.oceanForeground} />
                {(unreadCount.data ?? 0) > 0 ? (
                  <View
                    testID="explore-notifications-badge"
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      minWidth: 16,
                      height: 16,
                      borderRadius: theme.radii.full,
                      backgroundColor: theme.colors.destructive,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 3,
                    }}
                  >
                    <Caption style={{ color: theme.colors.textInverse, fontSize: 10, lineHeight: 12 }}>
                      {(unreadCount.data ?? 0) > 99 ? '99+' : unreadCount.data}
                    </Caption>
                  </View>
                ) : null}
              </Pressable>
            </Link>
          </View>

          <LargeTitle color={theme.colors.oceanForeground} style={{ marginBottom: theme.spacing.lg }}>
            Rent a motorbike, island to island
          </LargeTitle>

          <SearchForm onSubmit={handleSubmit} submitLabel="Search availability" />
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, paddingTop: theme.spacing.xl, gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <SectionTitle>Available near you</SectionTitle>
            {availableCount !== undefined ? (
              <Caption>
                {availableCount} ready for the next 2 days
              </Caption>
            ) : null}
          </View>

          {discovery.isLoading ? (
            // A single card matching VehicleResultItem's hero shape, not a
            // stack of full-height placeholder blocks — the discovery
            // section streams in fast, so a lighter, shape-matching
            // skeleton reads better than a heavy loading footprint.
            <GlassSurface tone="strong" style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
              <Skeleton height={140} radius={theme.radii.card} />
              <View style={{ gap: theme.spacing.xs }}>
                <Skeleton width="60%" height={20} />
                <Skeleton width="40%" height={13} />
                <Skeleton width="30%" height={13} />
              </View>
            </GlassSurface>
          ) : null}

          {showDiscoveryError ? (
            <ErrorState message={discovery.error?.message ?? ''} onRetry={() => discovery.refetch()} />
          ) : null}

          {!discovery.isLoading && !discovery.isError && (discovery.data?.length ?? 0) > 0
            ? discovery.data
                ?.slice(0, 4)
                .map((vehicle) => (
                  <VehicleResultItem
                    key={vehicle.vehicle_id}
                    vehicle={vehicle}
                    startsAt={discoveryCriteria.startsAt}
                    endsAt={discoveryCriteria.endsAt}
                    variant="hero"
                  />
                ))
            : null}

          {showDemoFallback
            ? DEMO_VEHICLES.map((vehicle) => (
                <VehicleResultItem
                  key={vehicle.vehicle_id}
                  vehicle={vehicle}
                  startsAt={discoveryCriteria.startsAt}
                  endsAt={discoveryCriteria.endsAt}
                  variant="hero"
                  demo
                />
              ))
            : null}

          {!discovery.isLoading && !discovery.isError && discovery.data?.length === 0 && !showDemoFallback ? (
            <EmptyState
              icon="bicycle-outline"
              title="No motorcycles listed yet"
              message="Check back soon, or choose your own dates above to search a specific window."
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
