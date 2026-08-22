import { Image } from 'expo-image';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { useTheme } from '../../design-system/ThemeProvider';
import { formatMaldivesDateTime } from '../../lib/datetime';
import { useAcknowledgeInspection, useInspectionPhotos, type Inspection } from './queries';

const TYPE_LABEL: Record<Inspection['inspection_type'], string> = { pickup: 'Pickup', return: 'Return' };

interface InspectionSummaryProps {
  inspection: Inspection;
  bookingId: string;
  /** Only the booking's own customer may acknowledge (acknowledge_inspection
   * re-checks this server-side regardless -- see 20260821160001); the
   * caller decides whether to offer the action based on who's viewing. */
  canAcknowledge: boolean;
}

export function InspectionSummary({ inspection, bookingId, canAcknowledge }: InspectionSummaryProps) {
  const theme = useTheme();
  const photos = useInspectionPhotos(bookingId, inspection.inspection_type);
  const acknowledge = useAcknowledgeInspection();
  const label = TYPE_LABEL[inspection.inspection_type];
  const accessories = Object.entries(inspection.accessories_checklist as Record<string, boolean>).filter(
    ([, present]) => present,
  );

  return (
    <View style={{ gap: theme.spacing.sm }} testID={`inspection-summary-${inspection.inspection_type}`}>
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{label} inspection</Text>
      <Text style={{ color: theme.colors.textSecondary }}>
        {inspection.odometer_km != null ? `${inspection.odometer_km} km` : 'Odometer not recorded'}
        {inspection.fuel_battery_percent != null ? ` · ${inspection.fuel_battery_percent}% fuel/battery` : ''}
      </Text>
      {accessories.length > 0 ? (
        <Text style={{ color: theme.colors.textSecondary }}>
          Accessories: {accessories.map(([key]) => key.replace('_', ' ')).join(', ')}
        </Text>
      ) : null}
      {inspection.condition_notes ? (
        <Text style={{ color: theme.colors.textSecondary }}>{inspection.condition_notes}</Text>
      ) : null}

      {photos.data && photos.data.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          testID={`inspection-photos-${inspection.inspection_type}`}
        >
          {photos.data.map((photo) =>
            photo.signedUrl ? (
              <Image
                key={photo.id}
                source={{ uri: photo.signedUrl }}
                style={{ width: 100, height: 100, borderRadius: 8, marginRight: theme.spacing.sm }}
                contentFit="cover"
                accessibilityLabel={`${label} inspection photo`}
              />
            ) : null,
          )}
        </ScrollView>
      ) : null}

      {inspection.acknowledged_at ? (
        <Text
          style={{ color: theme.colors.success }}
          testID={`inspection-acknowledged-${inspection.inspection_type}`}
        >
          Acknowledged {formatMaldivesDateTime(inspection.acknowledged_at)}
        </Text>
      ) : canAcknowledge ? (
        <Button
          testID={`inspection-acknowledge-${inspection.inspection_type}`}
          label="I agree with this record"
          onPress={() => acknowledge.mutate(inspection.id)}
          loading={acknowledge.isPending}
        />
      ) : (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Not yet acknowledged</Text>
      )}
    </View>
  );
}
