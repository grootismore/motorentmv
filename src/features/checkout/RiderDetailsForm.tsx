import { View } from 'react-native';

import { TextField } from '../../components/TextField';
import { SectionTitle } from '../../components/Typography';
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
 * Document upload (driver's license / ID, PRD §6.5) is its own section
 * further down checkout (src/features/documents/DocumentsSection.tsx) —
 * it's a hard requirement to submit a booking request (20260821220001), not
 * just a courtesy reminder here, so it gets its own section rather than a
 * pointer inside this one. It's profile-scoped, so one upload still covers
 * every future booking.
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
    </View>
  );
}
