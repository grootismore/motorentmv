import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { Button } from '../../../src/components/Button';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { GlassSurface } from '../../../src/components/GlassSurface';
import { Screen } from '../../../src/components/Screen';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { Body, Caption, Label } from '../../../src/components/Typography';
import { TextField } from '../../../src/components/TextField';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { useRecordExpense } from '../../../src/features/finance/queries';
import { useVehicles } from '../../../src/features/fleet/queries';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';
import { formatMaldivesDate, maldivesDateKey } from '../../../src/lib/datetime';

// A starter taxonomy matching the categories Prompt 7 asks a renter to be
// able to record against -- `expenses.category` is plain text (not yet
// an enum; see 20260821120016_expenses.sql), so this is a UI-level
// convenience list, not a schema constraint. Prompt 11 ("renter finance
// tracking") is expected to formalize the full category set; this list
// intentionally doesn't try to preempt that.
const CATEGORIES = ['Maintenance', 'Repairs', 'Registration', 'Insurance', 'Fuel', 'Cleaning', 'Other'];

function OccurredOnPicker({ valueIso, onChange }: { valueIso: string; onChange: (iso: string) => void }) {
  const theme = useTheme();
  const [showIosPicker, setShowIosPicker] = useState(false);
  const value = new Date(`${valueIso}T00:00:00`);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        onChange: (_event, picked) => {
          if (!picked) return;
          onChange(maldivesDateKey(picked.toISOString()));
        },
      });
    } else {
      setShowIosPicker(true);
    }
  };

  return (
    <View>
      <Label style={{ marginBottom: theme.spacing.xs }}>Date</Label>
      <Pressable
        testID="expense-date-field"
        accessibilityRole="button"
        accessibilityLabel={`Expense date: ${formatMaldivesDate(value.toISOString())}`}
        onPress={open}
      >
        <GlassSurface style={{ paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md }}>
          <Body>{formatMaldivesDate(value.toISOString())}</Body>
        </GlassSurface>
      </Pressable>
      {Platform.OS === 'ios' && showIosPicker ? (
        <DateTimePicker
          testID="expense-date-picker"
          value={value}
          mode="date"
          display="inline"
          maximumDate={new Date()}
          onValueChange={(_event, picked) => {
            onChange(maldivesDateKey(picked.toISOString()));
            setShowIosPicker(false);
          }}
        />
      ) : null}
    </View>
  );
}

export default function RecordExpense() {
  const theme = useTheme();
  const router = useRouter();
  const { organizationId } = useCurrentOrganization();
  const vehicles = useVehicles(organizationId);
  const recordExpense = useRecordExpense();

  const [category, setCategory] = useState(CATEGORIES[0] as string);
  const [vehicleId, setVehicleId] = useState<string>('none');
  const [amountText, setAmountText] = useState('');
  const [occurredOn, setOccurredOn] = useState(() => maldivesDateKey(new Date().toISOString()));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (vehicles.isLoading) {
    return (
      <Screen title="Record expense">
        <LoadingState label="Loading fleet…" />
      </Screen>
    );
  }

  if (vehicles.isError) {
    return (
      <Screen title="Record expense">
        <ErrorState message={vehicles.error.message} onRetry={() => vehicles.refetch()} />
      </Screen>
    );
  }

  const vehicleOptions = [
    { value: 'none', label: 'No specific vehicle' },
    ...(vehicles.data ?? []).map((v) => ({
      value: v.id,
      label: `${v.make ?? ''} ${v.model ?? ''}`.trim() || v.registration_number,
    })),
  ];

  const handleSubmit = async () => {
    setError(null);
    const amountMvr = Number(amountText);
    if (!Number.isFinite(amountMvr) || amountMvr <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    try {
      await recordExpense.mutateAsync({
        organizationId,
        vehicleId: vehicleId === 'none' ? undefined : vehicleId,
        category,
        amountLaari: Math.round(amountMvr * 100),
        occurredOn,
        note: note.trim() || undefined,
      });
      router.back();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not record this expense.');
    }
  };

  return (
    <Screen title="Record expense" scroll>
      <View style={{ gap: theme.spacing.lg }}>
        <ChipSelect
          testID="expense-category"
          label="Category"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          value={category}
          onChange={setCategory}
        />

        <ChipSelect
          testID="expense-vehicle"
          label="Vehicle"
          options={vehicleOptions}
          value={vehicleId}
          onChange={setVehicleId}
        />

        <TextField
          testID="expense-amount"
          label="Amount (MVR)"
          keyboardType="decimal-pad"
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0.00"
        />

        <OccurredOnPicker valueIso={occurredOn} onChange={setOccurredOn} />

        <TextField
          testID="expense-note"
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          multiline
        />

        {error ? (
          <Body testID="expense-form-error" color={theme.colors.destructive}>
            {error}
          </Body>
        ) : null}

        <Button
          testID="expense-submit"
          label="Record expense"
          loading={recordExpense.isPending}
          onPress={() => {
            void handleSubmit();
          }}
        />
        <Caption>Receipts can be attached from the vehicle&apos;s Maintenance section.</Caption>
      </View>
    </Screen>
  );
}
