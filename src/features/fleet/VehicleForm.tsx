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
  internal_code: string;
  make: string;
  model: string;
  year: string;
  category: string;
  engine_size_cc: string;
  color: string;
  transmission: Transmission;
  status: VehicleStatus;
  odometer_km: string;
  deposit_amount_laari: string;
  location: string;
  included_accessories: string;
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
  internal_code: '',
  make: '',
  model: '',
  year: '',
  category: '',
  engine_size_cc: '',
  color: '',
  transmission: 'automatic',
  status: 'draft',
  odometer_km: '0',
  deposit_amount_laari: '',
  location: '',
  included_accessories: '',
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
        testID={`${testIDPrefix}-internal-code`}
        label="Internal code (optional)"
        value={values.internal_code}
        onChangeText={(v) => setField('internal_code', v)}
        placeholder="BIKE-04"
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
        testID={`${testIDPrefix}-category`}
        label="Category (optional)"
        value={values.category}
        onChangeText={(v) => setField('category', v)}
        placeholder="Scooter"
        editable={!isSubmitting}
      />
      <TextField
        testID={`${testIDPrefix}-engine-size`}
        label="Engine size (cc, optional)"
        value={values.engine_size_cc}
        onChangeText={(v) => setField('engine_size_cc', v)}
        placeholder="125"
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
        testID={`${testIDPrefix}-odometer`}
        label="Odometer (km)"
        value={values.odometer_km}
        onChangeText={(v) => setField('odometer_km', v)}
        placeholder="0"
        keyboardType="number-pad"
        editable={!isSubmitting}
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
      <TextField
        testID={`${testIDPrefix}-accessories`}
        label="Included accessories (comma-separated, optional)"
        value={values.included_accessories}
        onChangeText={(v) => setField('included_accessories', v)}
        placeholder="Helmet, phone mount"
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
  internal_code: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  category: string | null;
  engine_size_cc: number | null;
  color: string | null;
  transmission: Transmission;
  status: VehicleStatus;
  odometer_km: number;
  deposit_amount_laari: number;
  location: string | null;
  included_accessories: string[];
}

/** A non-negative whole number entered by a human, or `null` if the field
 * was left blank -- distinct from `mvrToLaari` in that there's no
 * laari/MVR scaling and blank means "unset", not zero. */
function parseNonNegativeInt(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 0) return undefined;
  return value;
}

export function vehicleFormToInsert(values: VehicleFormValues): VehicleFormPayload | null {
  const depositLaari = mvrToLaari(values.deposit_amount_laari);
  if (depositLaari === null) return null;

  const engineSizeCc = parseNonNegativeInt(values.engine_size_cc);
  if (engineSizeCc === undefined) return null;

  const odometerKm = parseNonNegativeInt(values.odometer_km);
  if (odometerKm === undefined) return null;

  return {
    registration_number: values.registration_number.trim(),
    internal_code: values.internal_code.trim() || null,
    make: values.make.trim() || null,
    model: values.model.trim() || null,
    year: values.year.trim() ? Number(values.year.trim()) : null,
    category: values.category.trim() || null,
    engine_size_cc: engineSizeCc,
    color: values.color.trim() || null,
    transmission: values.transmission,
    status: values.status,
    odometer_km: odometerKm ?? 0,
    deposit_amount_laari: depositLaari,
    location: values.location.trim() || null,
    included_accessories: values.included_accessories
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  };
}
