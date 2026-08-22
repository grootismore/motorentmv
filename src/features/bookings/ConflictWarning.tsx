import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import { Label, SecondaryBody } from '../../components/Typography';
import { formatMaldivesDateTime } from '../../lib/datetime';
import type { ConflictWindow } from './queries';

/**
 * Shows that a conflict exists and why (a confirmed booking vs. a
 * maintenance/manual block) without ever naming or otherwise identifying
 * the other booking or its customer (PRD §6.4) — vehicle_busy_ranges only
 * ever returns a time range for that case, nothing else.
 */
export function ConflictWarning({ conflicts }: { conflicts: ConflictWindow[] }) {
  const theme = useTheme();
  if (conflicts.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.colors.destructive,
          borderRadius: theme.radii.card,
          backgroundColor: theme.colors.glassSurfaceStrong,
        },
      ]}
      accessible
      accessibilityRole="alert"
      testID="booking-conflict-warning"
    >
      <Label color={theme.colors.destructive}>⚠ Scheduling conflict</Label>
      <SecondaryBody style={{ marginTop: theme.spacing.xs }}>
        This vehicle is already unavailable for part of the requested period:
      </SecondaryBody>
      {conflicts.map((conflict, index) => (
        <SecondaryBody key={index} style={{ marginTop: theme.spacing.xs }}>
          • {conflict.reason}: {formatMaldivesDateTime(conflict.starts_at)} →{' '}
          {formatMaldivesDateTime(conflict.ends_at)}
        </SecondaryBody>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
});
