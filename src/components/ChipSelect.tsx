import { Pressable, StyleSheet, View } from 'react-native';

import { minTouchTarget } from '../design-system/tokens';
import { useTheme } from '../design-system/ThemeProvider';
import { Caption } from './Typography';

interface ChipSelectProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  testID,
}: ChipSelectProps<T>) {
  const theme = useTheme();

  return (
    <View>
      <Caption style={{ marginBottom: theme.spacing.xs }}>{label}</Caption>
      <View style={[styles.row, { gap: theme.spacing.sm }]}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              testID={testID ? `${testID}-${option.value}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected ? theme.colors.lagoonPrimary : theme.colors.glassSurface,
                  borderColor: selected ? theme.colors.lagoonPrimary : theme.colors.glassBorder,
                  borderRadius: theme.radii.full,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Caption
                style={{ fontWeight: '600' }}
                color={selected ? theme.colors.textInverse : theme.colors.textPrimary}
              >
                {option.label}
              </Caption>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    minHeight: minTouchTarget,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
