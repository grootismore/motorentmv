import { Link, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button } from '../../../../src/components/Button';
import { GroupedSection } from '../../../../src/components/GroupedSection';
import { Screen } from '../../../../src/components/Screen';
import { ErrorState } from '../../../../src/components/states/ErrorState';
import { LoadingState } from '../../../../src/components/states/LoadingState';
import { SecondaryBody, SectionTitle } from '../../../../src/components/Typography';
import { useTheme } from '../../../../src/design-system/ThemeProvider';
import { AvailabilityBlocksSection } from '../../../../src/features/fleet/AvailabilityBlocksSection';
import { PhotosSection } from '../../../../src/features/fleet/PhotosSection';
import { useVehicle } from '../../../../src/features/fleet/queries';
import { RatesSection } from '../../../../src/features/fleet/RatesSection';

export default function VehicleDetail() {
  const theme = useTheme();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicle = useVehicle(vehicleId);

  if (vehicle.isLoading) {
    return <LoadingState label="Loading vehicle…" />;
  }

  if (vehicle.isError || !vehicle.data) {
    return (
      <ErrorState
        message={vehicle.error?.message ?? 'Vehicle not found.'}
        onRetry={() => vehicle.refetch()}
      />
    );
  }

  const v = vehicle.data;

  return (
    <Screen
      title={v.make || v.model ? `${v.make ?? ''} ${v.model ?? ''}`.trim() : v.registration_number}
      description={v.registration_number}
      scroll
    >
      <View style={{ gap: theme.spacing.xl }}>
        <Link href={{ pathname: '/fleet/[vehicleId]/edit', params: { vehicleId: v.id } }} asChild>
          <Button testID="vehicle-edit" label="Edit details" variant="secondary" />
        </Link>

        <GroupedSection title="Vehicle">
          <View style={{ gap: theme.spacing.xs }}>
            <SecondaryBody>Status: {v.status}</SecondaryBody>
            <SecondaryBody>Deposit: MVR {(v.deposit_amount_laari / 100).toFixed(2)}</SecondaryBody>
            <SecondaryBody>Odometer: {v.odometer_km.toLocaleString()} km</SecondaryBody>
          </View>
        </GroupedSection>

        <View style={{ gap: theme.spacing.md }}>
          <SectionTitle>Photos</SectionTitle>
          <PhotosSection vehicleId={v.id} organizationId={v.organization_id} />
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <SectionTitle>Pricing</SectionTitle>
          <RatesSection vehicleId={v.id} />
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <SectionTitle>Availability blocks</SectionTitle>
          <AvailabilityBlocksSection vehicleId={v.id} />
        </View>
      </View>
    </Screen>
  );
}
