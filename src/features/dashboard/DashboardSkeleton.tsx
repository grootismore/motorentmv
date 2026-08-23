import { View } from 'react-native';

import { Skeleton } from '../../components/Skeleton';
import { useTheme } from '../../design-system/ThemeProvider';

/** Shaped like the populated dashboard (four summary tiles, a finance
 * card, a today section, quick actions) rather than a generic spinner --
 * this screen explicitly calls for a loading *skeleton*, distinct from
 * the plain LoadingState spinner most other renter screens still use. */
export function DashboardSkeleton() {
  const theme = useTheme();

  return (
    <View
      style={{ gap: theme.spacing.xl }}
      testID="dashboard-skeleton"
      accessibilityLabel="Loading your dashboard"
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={84} radius={theme.radii.card} style={{ flex: 1 }} />
        ))}
      </View>
      <Skeleton height={140} radius={theme.radii.card} />
      <View style={{ gap: theme.spacing.sm }}>
        <Skeleton width={80} height={16} />
        <Skeleton height={90} radius={theme.radii.card} />
        <Skeleton height={90} radius={theme.radii.card} />
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Skeleton height={72} radius={theme.radii.card} style={{ flex: 1 }} />
        <Skeleton height={72} radius={theme.radii.card} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
