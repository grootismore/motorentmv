import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../design-system/ThemeProvider';
import { GlassSurface, type GlassTone } from './GlassSurface';
import { SectionTitle } from './Typography';

interface GroupedSectionProps {
  title?: string;
  trailing?: ReactNode;
  /** 'strong' for financial/operational content per the Ocean Glass rule:
   * more opaque behind money, schedules, customer details, inspection
   * checklists. */
  tone?: GlassTone;
  children: ReactNode;
  testID?: string;
}

/**
 * The one grouped-section wrapper used across detail/dashboard screens —
 * a section title with an inset GlassSurface card underneath, rather than
 * every screen inventing its own card. Avoid nesting a GroupedSection
 * inside another one; compose GroupedRow children instead (see below).
 */
export function GroupedSection({ title, trailing, tone = 'default', children, testID }: GroupedSectionProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }} testID={testID}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionTitle>{title}</SectionTitle>
          {trailing}
        </View>
      ) : null}
      <GlassSurface tone={tone} style={{ padding: theme.spacing.lg }}>
        {children}
      </GlassSurface>
    </View>
  );
}

interface GroupedRowProps {
  children: ReactNode;
  /** Omit the bottom divider for the last row in a GroupedSection. */
  isLast?: boolean;
  testID?: string;
}

/** One divided row inside a GroupedSection — the "inset grouped list" the
 * Ocean Glass reference uses for schedules and timelines: rows share one
 * card, separated by a hairline, not stacked as separate floating cards. */
export function GroupedRow({ children, isLast = false, testID }: GroupedRowProps) {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        { paddingVertical: theme.spacing.sm },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
      ]}
    >
      {children}
    </View>
  );
}
