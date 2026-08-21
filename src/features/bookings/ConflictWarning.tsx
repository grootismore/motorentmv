import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
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
          borderColor: theme.colors.danger,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.surface,
        },
      ]}
      accessible
      accessibilityRole="alert"
      testID="booking-conflict-warning"
    >
      <Text style={[styles.title, { color: theme.colors.danger }]}>⚠ Scheduling conflict</Text>
      <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>
        This vehicle is already unavailable for part of the requested period:
      </Text>
      {conflicts.map((conflict, index) => (
        <Text key={index} style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>
          • {conflict.reason}: {formatMaldivesDateTime(conflict.starts_at)} →{' '}
          {formatMaldivesDateTime(conflict.ends_at)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
});
