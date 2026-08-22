import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../components/Button';
import { ChipSelect } from '../../components/ChipSelect';
import { TextField } from '../../components/TextField';
import { Caption } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import type { Database } from '../../lib/database.types';

type VehicleStatus = Database['public']['Enums']['vehicle_status'];
type Transmission = Database['public']['Enums']['transmission_type'];

const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
];

const TRANSMISSION_OPTIONS: { value: Transmission; label: string }[] = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
];

export interface VehicleFormValues {
  registration_number: string;
  make: string;
  model: string;
  year: string;
  color: string;
  transmission: Transmission;
  status: VehicleStatus;
  deposit_amount_laari: string;
  location: string;
}

interface VehicleFormProps {
  initialValues?: Partial<VehicleFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (values: VehicleFormValues) => void;
  testIDPrefix: string;
}

const DEFAULTS: VehicleFormValues = {
  registration_number: '',
  make: '',
  model: '',
  year: '',
  color: '',
  transmission: 'automatic',
  status: 'draft',
  deposit_amount_laari: '',
  location: '',
};

export function VehicleForm({
  initialValues,
  submitLabel,
  isSubmitting,
  errorMessage,
  onSubmit,
  testIDPrefix,
}: VehicleFormProps) {
  const theme = useTheme();
  const [values, setValues] = useState<VehicleFormValues>({ ...DEFAULTS, ...initialValues });

  const setField = <K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <TextField
        testID={`${testIDPrefix}-registration`}
        label="Registration number"
        value={values.registration_number}
        onChangeText={(v) => setField('registration_number', v)}
        placeholder="P-1001-AA"
        autoCapitalize="characters"
        editable={!isSubmitting}
      />
      <TextField
        testID={`${testIDPrefix}-make`}
        label="Make"
        value={values.make}
        onChangeText={(v) => setField('make', v)}
        placeholder="Honda"
        editable={!isSubmitting}
      />
      <TextField
        testID={`${testIDPrefix}-model`}
        label="Model"
        value={values.model}
        onChangeText={(v) => setField('model', v)}
        placeholder="Activa"
        editable={!isSubmitting}
      />
      <TextField
        testID={`${testIDPrefix}-year`}
        label="Year"
        value={values.year}
        onChangeText={(v) => setField('year', v)}
        placeholder="2023"
        keyboardType="number-pad"
        editable={!isSubmitting}
      />
      <TextField
        testID={`${testIDPrefix}-color`}
        label="Color"
        value={values.color}
        onChangeText={(v) => setField('color', v)}
        placeholder="Red"
        editable={!isSubmitting}
      />
      <ChipSelect
        testID={`${testIDPrefix}-transmission`}
        label="Transmission"
        options={TRANSMISSION_OPTIONS}
        value={values.transmission}
        onChange={(v) => setField('transmission', v)}
      />
      <ChipSelect
        testID={`${testIDPrefix}-status`}
        label="Status"
        options={STATUS_OPTIONS}
        value={values.status}
        onChange={(v) => setField('status', v)}
      />
      <TextField
        testID={`${testIDPrefix}-deposit`}
        label="Deposit (MVR)"
        value={values.deposit_amount_laari}
        onChangeText={(v) => setField('deposit_amount_laari', v)}
        placeholder="2000"
        keyboardType="decimal-pad"
        editable={!isSubmitting}
      />
      <TextField
        testID={`${testIDPrefix}-location`}
        label="Location"
        value={values.location}
        onChangeText={(v) => setField('location', v)}
        placeholder="Hulhumale"
        editable={!isSubmitting}
      />
      {errorMessage ? (
        <Caption testID={`${testIDPrefix}-error`} accessibilityRole="alert" color={theme.colors.destructive}>
          {errorMessage}
        </Caption>
      ) : null}
      <Button
        testID={`${testIDPrefix}-submit`}
        label={submitLabel}
        onPress={() => onSubmit(values)}
        loading={isSubmitting}
      />
    </View>
  );
}

/** MVR entered by a human -> integer laari stored in the database. */
export function mvrToLaari(mvrText: string): number | null {
  const trimmed = mvrText.trim();
  if (!trimmed) return 0;
  const value = Number(trimmed);
  if (Number.isNaN(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function laariToMvrText(laari: number | null | undefined): string {
  if (laari === null || laari === undefined) return '';
  return (laari / 100).toString();
}

interface VehicleFormPayload {
  registration_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  transmission: Transmission;
  status: VehicleStatus;
  deposit_amount_laari: number;
  location: string | null;
}

export function vehicleFormToInsert(values: VehicleFormValues): VehicleFormPayload | null {
  const depositLaari = mvrToLaari(values.deposit_amount_laari);
  if (depositLaari === null) return null;
  return {
    registration_number: values.registration_number.trim(),
    make: values.make.trim() || null,
    model: values.model.trim() || null,
    year: values.year.trim() ? Number(values.year.trim()) : null,
    color: values.color.trim() || null,
    transmission: values.transmission,
    status: values.status,
    deposit_amount_laari: depositLaari,
    location: values.location.trim() || null,
  };
}
