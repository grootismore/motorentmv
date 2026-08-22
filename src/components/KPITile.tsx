import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useTheme } from '../design-system/ThemeProvider';
import { GlassSurface } from './GlassSurface';
import { Caption, KPIText } from './Typography';

export type KPITone = 'lagoon' | 'success' | 'information' | 'overdue';

interface KPITileProps {
  icon: keyof typeof Ionicons.glyphMap;
  tone: KPITone;
  value: number | string;
  label: string;
  testID?: string;
}

/**
 * Flat frosted KPI tile — a colored icon circle, a bold number, a label
 * underneath. Deliberately flat: no bevel, no inflated/embossed circle,
 * separation comes only from the icon's own fill color and the tile's
 * GlassSurface background.
 */
export function KPITile({ icon, tone, value, label, testID }: KPITileProps) {
  const theme = useTheme();
  const toneColor = {
    lagoon: theme.colors.lagoonPrimary,
    success: theme.colors.success,
    information: theme.colors.information,
    overdue: theme.colors.overdue,
  }[tone];

  return (
    <GlassSurface
      testID={testID}
      style={{ flex: 1, padding: theme.spacing.md, alignItems: 'center', gap: theme.spacing.xs }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: theme.radii.full,
          backgroundColor: toneColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={17} color={theme.colors.textInverse} />
      </View>
      <KPIText>{value}</KPIText>
      <Caption>{label}</Caption>
    </GlassSurface>
  );
}
