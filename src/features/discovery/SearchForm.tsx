import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../components/Button';
import { DateRangeSelector } from '../../components/DateRangeSelector';
import { GlassSurface } from '../../components/GlassSurface';
import { TextField } from '../../components/TextField';
import { Caption } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';

export interface SearchFormValues {
  location: string;
  startsAtUtc: string;
  endsAtUtc: string;
}

interface SearchFormProps {
  initialLocation?: string;
  initialStartsAtUtc?: string;
  initialEndsAtUtc?: string;
  onSubmit: (values: SearchFormValues) => void;
  submitLabel?: string;
}

function defaultIso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

/**
 * Same location/pickup/return/validation logic as before this redesign,
 * and still Maldives-local under the hood (PRD Prompt 5) -- only the
 * date/time input mechanism changed, from a free-text "YYYY-MM-DD HH:mm"
 * field to a real native picker (DateRangeSelector), because the text
 * fields truncated visually at half-width on a physical device and never
 * satisfied "no truncation, human-readable" as a UI requirement. Still a
 * free-text location field (not a picker) so the placeholder stays
 * explicit about that, matching the actual interaction rather than
 * implying a dropdown that doesn't exist.
 */
export function SearchForm({
  initialLocation = '',
  initialStartsAtUtc,
  initialEndsAtUtc,
  onSubmit,
  submitLabel = 'Search',
}: SearchFormProps) {
  const theme = useTheme();
  const [location, setLocation] = useState(initialLocation);
  const [startsAtUtc, setStartsAtUtc] = useState(initialStartsAtUtc ?? defaultIso(24));
  const [endsAtUtc, setEndsAtUtc] = useState(initialEndsAtUtc ?? defaultIso(48));
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleSubmit = () => {
    if (new Date(endsAtUtc).getTime() <= new Date(startsAtUtc).getTime()) {
      setErrorMessage('Return must be after pickup.');
      return;
    }
    setErrorMessage(undefined);
    onSubmit({ location: location.trim(), startsAtUtc, endsAtUtc });
  };

  return (
    <View style={{ gap: theme.spacing.md }} testID="search-form">
      <GlassSurface tone="strong" style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <TextField
          testID="search-form-location"
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="Malé, Hulhumalé…"
        />
        <DateRangeSelector
          testIDPrefix="search-form"
          startsAtUtc={startsAtUtc}
          endsAtUtc={endsAtUtc}
          onChange={({ startsAtUtc: nextStart, endsAtUtc: nextEnd }) => {
            setStartsAtUtc(nextStart);
            setEndsAtUtc(nextEnd);
          }}
        />
      </GlassSurface>

      {errorMessage ? (
        <Caption testID="search-form-error" accessibilityRole="alert" color={theme.colors.destructive}>
          {errorMessage}
        </Caption>
      ) : null}
      <Button testID="search-form-submit" label={submitLabel} onPress={handleSubmit} />
    </View>
  );
}
