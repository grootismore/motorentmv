import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import type { StatusTone } from './status';

/** Status is always conveyed by the label text itself, never color alone
 * (PRD §11) — the tone only adds a redundant visual cue on top. */
export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const theme = useTheme();
  const toneColor = {
    neutral: theme.colors.textSecondary,
    info: theme.colors.info,
    warning: theme.colors.warning,
    success: theme.colors.success,
    danger: theme.colors.danger,
  }[tone];

  return (
    <View
      style={[
        styles.badge,
        { borderColor: toneColor, borderRadius: theme.radii.full, backgroundColor: theme.colors.surface },
      ]}
    >
      <Text style={[styles.label, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
