import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../components/Button';
import { GlassSurface } from '../../components/GlassSurface';
import { TextField } from '../../components/TextField';
import { Caption } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { maldivesInputToUtcIso, utcIsoToMaldivesInput } from '../../lib/datetime';

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

/**
 * Dates are entered as Maldives-local "YYYY-MM-DD HH:mm" — the customer
 * picks pickup/return in the time zone the rental actually happens in,
 * per PRD Prompt 5 ("display dates in Indian/Maldives time"), regardless
 * of the device's own time zone. No date-picker dependency was added for
 * this (same call as AvailabilityBlocksSection in Prompt 3) — this
 * differs from that screen only in *which* time zone the text is parsed
 * as: Maldives here (customer-facing, PRD-mandated), device-local there
 * (a renter's own internal tool).
 */
function parseMaldivesField(input: string): string | null {
  const trimmed = input.trim();
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/.exec(trimmed);
  if (!match) return null;
  return maldivesInputToUtcIso(match[1]!, match[2]!);
}

function fieldFromUtcIso(iso: string): string {
  const { date, time } = utcIsoToMaldivesInput(iso);
  return `${date} ${time}`;
}

function defaultField(hoursFromNow: number): string {
  return fieldFromUtcIso(new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString());
}

/**
 * Same location/pickup/return/validation logic as before this redesign —
 * only the JSX arrangement changed, to match the Ocean Glass reference's
 * "one flat frosted panel: location on its own row, pickup/return side by
 * side underneath" search card. Still a free-text location field (not a
 * picker) so the placeholder stays explicit about that, matching the
 * actual interaction rather than implying a dropdown that doesn't exist.
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
  const [startsField, setStartsField] = useState(
    initialStartsAtUtc ? fieldFromUtcIso(initialStartsAtUtc) : defaultField(24),
  );
  const [endsField, setEndsField] = useState(
    initialEndsAtUtc ? fieldFromUtcIso(initialEndsAtUtc) : defaultField(48),
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleSubmit = () => {
    const startsAtUtc = parseMaldivesField(startsField);
    const endsAtUtc = parseMaldivesField(endsField);
    if (!startsAtUtc || !endsAtUtc) {
      setErrorMessage('Enter dates as YYYY-MM-DD HH:mm (Maldives time).');
      return;
    }
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
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              testID="search-form-starts"
              label="Pick-up"
              value={startsField}
              onChangeText={setStartsField}
              placeholder="2026-09-01 09:00"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              testID="search-form-ends"
              label="Return"
              value={endsField}
              onChangeText={setEndsField}
              placeholder="2026-09-02 09:00"
            />
          </View>
        </View>
        <Caption>Dates and times are Maldives local (Indian/Maldives, UTC+5).</Caption>
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
