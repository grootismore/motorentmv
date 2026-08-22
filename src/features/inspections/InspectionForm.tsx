import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useTheme } from '../../design-system/ThemeProvider';
import { requestImagePermission } from '../../lib/uploads';
import { useRecordInspection, type InspectionPhotoInput, type InspectionType } from './queries';

const ACCESSORIES: { key: string; label: string }[] = [
  { key: 'helmet', label: 'Helmet' },
  { key: 'lock', label: 'Lock' },
  { key: 'phone_holder', label: 'Phone holder' },
  { key: 'charger', label: 'Charger' },
];

const TYPE_LABEL: Record<InspectionType, string> = { pickup: 'Pickup', return: 'Return' };

interface InspectionFormProps {
  bookingId: string;
  organizationId: string;
  inspectionType: InspectionType;
}

/** Records a pickup or return checklist -- org staff only (matches
 * inspections_write_org_member). Photos are compressed and uploaded with
 * retry (src/lib/uploads.ts) before the checklist row itself is
 * considered recorded, so a flaky connection at handover doesn't leave a
 * checklist with no supporting photos. */
export function InspectionForm({ bookingId, organizationId, inspectionType }: InspectionFormProps) {
  const theme = useTheme();
  const record = useRecordInspection();
  const [odometerKm, setOdometerKm] = useState('');
  const [fuelBatteryPercent, setFuelBatteryPercent] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [accessories, setAccessories] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<InspectionPhotoInput[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const label = TYPE_LABEL[inspectionType];

  const addPhoto = async (source: 'library' | 'camera') => {
    setErrorMessage(undefined);
    const { granted } = await requestImagePermission(source);
    if (!granted) {
      setErrorMessage('Permission is required to add a photo.');
      return;
    }
    const result =
      source === 'library'
        ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
        : await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotos((prev) => [...prev, { uri: asset.uri, width: asset.width, height: asset.height }]);
  };

  const handleSubmit = () => {
    setErrorMessage(undefined);
    record.mutate(
      {
        bookingId,
        organizationId,
        inspectionType,
        odometerKm: odometerKm.trim() ? Number(odometerKm) : null,
        fuelBatteryPercent: fuelBatteryPercent.trim() ? Number(fuelBatteryPercent) : null,
        conditionNotes,
        accessoriesChecklist: accessories,
        photos,
      },
      { onError: (error) => setErrorMessage(error.message) },
    );
  };

  return (
    <View style={{ gap: theme.spacing.md }} testID={`inspection-form-${inspectionType}`}>
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 }}>
        {label} inspection
      </Text>

      <TextField
        testID={`inspection-odometer-${inspectionType}`}
        label="Odometer (km)"
        value={odometerKm}
        onChangeText={setOdometerKm}
        keyboardType="number-pad"
      />
      <TextField
        testID={`inspection-fuel-${inspectionType}`}
        label="Fuel/battery (%)"
        value={fuelBatteryPercent}
        onChangeText={setFuelBatteryPercent}
        keyboardType="number-pad"
      />
      <TextField
        testID={`inspection-notes-${inspectionType}`}
        label="Condition notes"
        value={conditionNotes}
        onChangeText={setConditionNotes}
        multiline
      />

      <View>
        <Text
          style={{ color: theme.colors.textSecondary, fontWeight: '600', marginBottom: theme.spacing.xs }}
        >
          Accessories present
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {ACCESSORIES.map((item) => (
            <Button
              key={item.key}
              testID={`inspection-accessory-${item.key}`}
              label={item.label}
              variant={accessories[item.key] ? 'primary' : 'secondary'}
              onPress={() => setAccessories((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button
          testID={`inspection-add-photo-library-${inspectionType}`}
          label="Choose photo"
          variant="secondary"
          onPress={() => addPhoto('library')}
        />
        <Button
          testID={`inspection-add-photo-camera-${inspectionType}`}
          label="Take photo"
          variant="secondary"
          onPress={() => addPhoto('camera')}
        />
      </View>
      {photos.length > 0 ? (
        <Text
          style={{ color: theme.colors.textSecondary }}
          testID={`inspection-photo-count-${inspectionType}`}
        >
          {photos.length} photo{photos.length === 1 ? '' : 's'} attached
        </Text>
      ) : null}

      {errorMessage ? (
        <Text
          style={{ color: theme.colors.danger }}
          accessibilityRole="alert"
          testID={`inspection-error-${inspectionType}`}
        >
          {errorMessage}
        </Text>
      ) : null}

      <Button
        testID={`inspection-submit-${inspectionType}`}
        label={`Record ${label.toLowerCase()} inspection`}
        onPress={handleSubmit}
        loading={record.isPending}
      />
    </View>
  );
}
