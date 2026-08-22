import { View } from 'react-native';

import { ChipSelect } from '../../components/ChipSelect';
import { useTheme } from '../../design-system/ThemeProvider';
import type { Database } from '../../lib/database.types';

export type TransmissionFilter = 'any' | Database['public']['Enums']['transmission_type'];
export type MaxRateFilter = 'any' | '15000' | '25000' | '40000';

export interface FilterValues {
  transmission: TransmissionFilter;
  maxDailyRateLaari: MaxRateFilter;
}

const TRANSMISSION_OPTIONS: { value: TransmissionFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
];

const MAX_RATE_OPTIONS: { value: MaxRateFilter; label: string }[] = [
  { value: 'any', label: 'Any price' },
  { value: '15000', label: 'Under MVR 150' },
  { value: '25000', label: 'Under MVR 250' },
  { value: '40000', label: 'Under MVR 400' },
];

/** Vehicle category has no fixed taxonomy yet (PRD §16, open decision —
 * same reason `vehicles.category` is free text, not an enum), so it
 * isn't offered as a filter here; transmission and price band are. */
export function FilterBar({
  values,
  onChange,
}: {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }} testID="search-filter-bar">
      <ChipSelect
        testID="filter-transmission"
        label="Transmission"
        options={TRANSMISSION_OPTIONS}
        value={values.transmission}
        onChange={(transmission) => onChange({ ...values, transmission })}
      />
      <ChipSelect
        testID="filter-max-rate"
        label="Daily rate"
        options={MAX_RATE_OPTIONS}
        value={values.maxDailyRateLaari}
        onChange={(maxDailyRateLaari) => onChange({ ...values, maxDailyRateLaari })}
      />
    </View>
  );
}
