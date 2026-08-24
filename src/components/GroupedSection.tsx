import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Host, FieldGroup, RNHostView } from '@expo/ui';

import { useTheme } from '../design-system/ThemeProvider';
import { SectionTitle } from './Typography';

interface GroupedSectionProps {
  title?: string;
  trailing?: ReactNode;
  children: ReactNode;
  testID?: string;
}

/**
 * The one grouped-section wrapper used across detail/dashboard screens —
 * a real native inset-grouped card (@expo/ui's FieldGroup, the same
 * SwiftUI `Form`/Jetpack Compose treatment iOS Settings uses), not a
 * custom-drawn card. `children` can be arbitrary React Native content
 * (this app's rows mix images, badges, and buttons) -- FieldGroup.Section
 * accepts one native "row" per direct child, but our own rows are
 * complex/varied enough (see GroupedRow below) that this wraps `children`
 * as a single RNHostView-bridged row rather than mapping each GroupedRow
 * to its own native FieldGroup row, so none of that existing content
 * needs to change shape. Avoid nesting a GroupedSection inside another
 * one; compose GroupedRow children instead.
 */
export function GroupedSection({ title, trailing, children, testID }: GroupedSectionProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }} testID={testID}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionTitle>{title}</SectionTitle>
          {trailing}
        </View>
      ) : null}
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <FieldGroup>
          <FieldGroup.Section>
            <RNHostView>
              <View>{children}</View>
            </RNHostView>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </View>
  );
}

interface GroupedRowProps {
  children: ReactNode;
  /** Omit the bottom divider for the last row in a GroupedSection. */
  isLast?: boolean;
  testID?: string;
}

/** One divided row inside a GroupedSection — rows share the section's one
 * native card, separated by a hairline, not stacked as separate floating
 * cards. */
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
