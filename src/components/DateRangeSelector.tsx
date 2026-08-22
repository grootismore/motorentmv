import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { formatMaldivesDateShort, formatMaldivesTime12h, maldivesInputToUtcIso } from '../lib/datetime';
import { useTheme } from '../design-system/ThemeProvider';
import { GlassSurface } from './GlassSurface';
import { Body, Label } from './Typography';

interface DateRangeSelectorProps {
  startsAtUtc: string;
  endsAtUtc: string;
  onChange: (next: { startsAtUtc: string; endsAtUtc: string }) => void;
  testIDPrefix: string;
}

/** Reads the wall-clock digits a native picker displayed (its local
 * getters, not UTC) and re-interprets them as Maldives-local -- exactly
 * what the free-text field this replaces already did (a customer types
 * "09:00" meaning 9am Maldives time, regardless of the device's own time
 * zone). This keeps every existing Maldives-local conversion/validation
 * path (maldivesInputToUtcIso) unchanged; only the input mechanism moved
 * from typing digits to picking them off a wheel. */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function withPickedDate(baseIso: string, picked: Date): string {
  const dateStr = `${picked.getFullYear()}-${pad(picked.getMonth() + 1)}-${pad(picked.getDate())}`;
  const { time } = deriveExistingTime(baseIso);
  return maldivesInputToUtcIso(dateStr, time) ?? baseIso;
}

function withPickedTime(baseIso: string, picked: Date): string {
  const { date } = deriveExistingTime(baseIso);
  const timeStr = `${pad(picked.getHours())}:${pad(picked.getMinutes())}`;
  return maldivesInputToUtcIso(date, timeStr) ?? baseIso;
}

/** Re-derives the "YYYY-MM-DD"/"HH:mm" Maldives-local fields already
 * encoded in a UTC instant, so picking just the date (or just the time)
 * doesn't clobber the half not being edited. */
function deriveExistingTime(iso: string): { date: string; time: string } {
  // Mirrors utcIsoToMaldivesInput in lib/datetime.ts exactly (kept local
  // here to avoid a circular-feeling round trip through two conversions
  // for what's a single-purpose internal helper).
  const MALDIVES_OFFSET_MS = 5 * 60 * 60 * 1000;
  const shifted = new Date(new Date(iso).getTime() + MALDIVES_OFFSET_MS);
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
}

function DateTimeField({
  label,
  valueUtc,
  onChangeUtc,
  testID,
}: {
  label: string;
  valueUtc: string;
  onChangeUtc: (nextUtc: string) => void;
  testID: string;
}) {
  const theme = useTheme();
  const [iosStep, setIosStep] = useState<'closed' | 'date' | 'time'>('closed');
  const value = new Date(valueUtc);

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        onChange: (_event, pickedDate) => {
          if (!pickedDate) return;
          const afterDate = withPickedDate(valueUtc, pickedDate);
          DateTimePickerAndroid.open({
            value: new Date(afterDate),
            mode: 'time',
            is24Hour: false,
            onChange: (_e, pickedTime) => {
              if (!pickedTime) return;
              onChangeUtc(withPickedTime(afterDate, pickedTime));
            },
          });
        },
      });
    } else {
      setIosStep('date');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Label style={{ marginBottom: theme.spacing.xs }}>{label}</Label>
      <Pressable
        testID={testID}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatMaldivesDateShort(valueUtc)}, ${formatMaldivesTime12h(valueUtc)}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <GlassSurface style={{ paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md }}>
          <Body style={{ fontWeight: '600' }}>{formatMaldivesDateShort(valueUtc)}</Body>
          <Body>{formatMaldivesTime12h(valueUtc)}</Body>
        </GlassSurface>
      </Pressable>

      {Platform.OS === 'ios' && iosStep === 'date' ? (
        <DateTimePicker
          testID={`${testID}-date-picker`}
          value={value}
          mode="date"
          display="inline"
          onValueChange={(_event, picked) => {
            onChangeUtc(withPickedDate(valueUtc, picked));
            setIosStep('time');
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && iosStep === 'time' ? (
        <DateTimePicker
          testID={`${testID}-time-picker`}
          value={value}
          mode="time"
          display="spinner"
          onValueChange={(_event, picked) => {
            onChangeUtc(withPickedTime(valueUtc, picked));
            setIosStep('closed');
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * Replaces free-text "YYYY-MM-DD HH:mm" pickup/return fields with a real
 * native date/time picker (Sat, 23 Aug / 7:00 PM), fixing the raw-timestamp
 * truncation bug those fields had at half width on a physical device. The
 * underlying "enter Maldives-local time regardless of device time zone"
 * semantics (PRD Prompt 5) are unchanged -- only the input mechanism moved
 * from typing digits to picking them off a wheel; see withPickedDate/
 * withPickedTime above for how a picker's wall-clock digits are
 * re-interpreted as Maldives-local, same as the text field always did.
 */
export function DateRangeSelector({
  startsAtUtc,
  endsAtUtc,
  onChange,
  testIDPrefix,
}: DateRangeSelectorProps) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.md }} testID={`${testIDPrefix}-date-range`}>
      <DateTimeField
        label="Pick-up"
        valueUtc={startsAtUtc}
        onChangeUtc={(nextStart) => onChange({ startsAtUtc: nextStart, endsAtUtc })}
        testID={`${testIDPrefix}-starts`}
      />
      <DateTimeField
        label="Return"
        valueUtc={endsAtUtc}
        onChangeUtc={(nextEnd) => onChange({ startsAtUtc, endsAtUtc: nextEnd })}
        testID={`${testIDPrefix}-ends`}
      />
    </View>
  );
}
