import { Pressable, StyleSheet, Text, View } from 'react-native';

import { minTouchTarget } from '../design-system/tokens';
import { useTheme } from '../design-system/ThemeProvider';

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
      <Text style={[styles.label, { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }]}>
        {label}
      </Text>
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
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  borderRadius: theme.radii.full,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? theme.colors.primaryText : theme.colors.textPrimary,
                  fontWeight: '600',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    minHeight: minTouchTarget,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
