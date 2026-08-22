import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';

import { Button } from '../../components/Button';
import { Caption, SecondaryBody, SectionTitle } from '../../components/Typography';
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
      <SectionTitle>{label} inspection</SectionTitle>
      <SecondaryBody>
        {inspection.odometer_km != null ? `${inspection.odometer_km} km` : 'Odometer not recorded'}
        {inspection.fuel_battery_percent != null ? ` · ${inspection.fuel_battery_percent}% fuel/battery` : ''}
      </SecondaryBody>
      {accessories.length > 0 ? (
        <SecondaryBody>
          Accessories: {accessories.map(([key]) => key.replace('_', ' ')).join(', ')}
        </SecondaryBody>
      ) : null}
      {inspection.condition_notes ? <SecondaryBody>{inspection.condition_notes}</SecondaryBody> : null}

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
                style={{ width: 100, height: 100, borderRadius: 8, marginEnd: theme.spacing.sm }}
                contentFit="cover"
                accessibilityLabel={`${label} inspection photo`}
              />
            ) : null,
          )}
        </ScrollView>
      ) : null}

      {inspection.acknowledged_at ? (
        <Caption
          color={theme.colors.success}
          testID={`inspection-acknowledged-${inspection.inspection_type}`}
        >
          Acknowledged {formatMaldivesDateTime(inspection.acknowledged_at)}
        </Caption>
      ) : canAcknowledge ? (
        <Button
          testID={`inspection-acknowledge-${inspection.inspection_type}`}
          label="I agree with this record"
          onPress={() => acknowledge.mutate(inspection.id)}
          loading={acknowledge.isPending}
        />
      ) : (
        <Caption>Not yet acknowledged</Caption>
      )}
    </View>
  );
}
