import { View } from 'react-native';

import { GlassSurface } from '../../components/GlassSurface';
import { TextField } from '../../components/TextField';
import { Caption, SectionTitle } from '../../components/Typography';
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
      <SectionTitle>Rider details</SectionTitle>
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
      <GlassSurface style={{ padding: theme.spacing.md }} testID="rider-details-document-placeholder">
        <Caption>
          Driver&apos;s license / ID upload isn&apos;t built yet — please bring a valid license and ID with
          you at pickup. The renter may ask to see them before handing over the vehicle.
        </Caption>
      </GlassSurface>
    </View>
  );
}
