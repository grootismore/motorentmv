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
 * Document upload (driver's license / ID, PRD §6.5) lives on the
 * customer's Profile screen (src/features/documents/DocumentsSection.tsx),
 * not here — it's profile-scoped so one upload covers every future
 * booking, and at this point in checkout the booking this form is for
 * doesn't exist yet to attach a document to. This is just a pointer, not
 * an upload control.
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
          You can upload a photo of your driver&apos;s license and ID from your Profile at any time. Bring the
          physical documents to pickup too — the renter may ask to see them before handing over the vehicle.
        </Caption>
      </GlassSurface>
    </View>
  );
}
