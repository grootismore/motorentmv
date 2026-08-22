import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import type { StatusTone } from './status';

/** Status is always conveyed by the label text itself, never color alone
 * (PRD §11) — the tone only adds a redundant visual cue on top. Filled
 * capsule chips, matching the Ocean Glass reference's Available/Pickup/
 * Overdue/Partially-paid pills — solid tone color, no outline. */
export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const theme = useTheme();
  const { bg, fg } = {
    neutral: { bg: theme.colors.glassSurfaceStrong, fg: theme.colors.textSecondary },
    info: { bg: theme.colors.information, fg: theme.colors.textInverse },
    warning: { bg: theme.colors.warning, fg: theme.colors.textPrimary },
    success: { bg: theme.colors.success, fg: theme.colors.textInverse },
    danger: { bg: theme.colors.destructive, fg: theme.colors.textInverse },
    overdue: { bg: theme.colors.overdue, fg: theme.colors.textInverse },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: theme.radii.full }]}>
      <Text style={[theme.typography.variant.label, styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '700',
  },
});
