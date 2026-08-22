import { Text, View } from 'react-native';

import { TextField } from '../../components/TextField';
import { useTheme } from '../../design-system/ThemeProvider';

export interface RiderDetailsValues {
  fullName: string;
  phone: string;
}

interface RiderDetailsFormProps {
  values: RiderDetailsValues;
  onChange: (values: RiderDetailsValues) => void;
  errorMessage?: string;
}

/**
 * Document upload (driver's license / ID, PRD §6.5) is a placeholder
 * here, not implemented — same "clear placeholder, not a silent gap"
 * precedent as staff invitation in Prompt 3 (see (renter)/more/staff.tsx
 * and its README section): the `documents` table/document_type already
 * models this (`license`, `id_card`), the storage/RLS plumbing already
 * exists for org-scoped documents, but the actual camera/upload UI for a
 * customer's own license is a later addition, called out explicitly
 * rather than silently missing.
 */
export function RiderDetailsForm({ values, onChange, errorMessage }: RiderDetailsFormProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }} testID="rider-details-form">
      <Text
        style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: theme.typography.size.lg }}
      >
        Rider details
      </Text>
      <TextField
        testID="rider-details-full-name"
        label="Full name"
        value={values.fullName}
        onChangeText={(fullName) => onChange({ ...values, fullName })}
        autoComplete="name"
        textContentType="name"
        errorMessage={errorMessage}
      />
      <TextField
        testID="rider-details-phone"
        label="Phone"
        value={values.phone}
        onChangeText={(phone) => onChange({ ...values, phone })}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.md,
        }}
        testID="rider-details-document-placeholder"
      >
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
          Driver&apos;s license / ID upload isn&apos;t built yet — please bring a valid license and ID with
          you at pickup. The renter may ask to see them before handing over the vehicle.
        </Text>
      </View>
    </View>
  );
}
