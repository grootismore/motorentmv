import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Screen } from '../../../src/components/Screen';
import { useCreateVehicle } from '../../../src/features/fleet/queries';
import { VehicleForm, vehicleFormToInsert } from '../../../src/features/fleet/VehicleForm';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';

export default function NewVehicle() {
  const router = useRouter();
  const { organizationId } = useCurrentOrganization();
  const createVehicle = useCreateVehicle(organizationId);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  return (
    <Screen title="Add vehicle" scroll>
      <VehicleForm
        testIDPrefix="new-vehicle"
        submitLabel="Add vehicle"
        isSubmitting={createVehicle.isPending}
        errorMessage={errorMessage}
        onSubmit={(values) => {
          const payload = vehicleFormToInsert(values);
          if (!payload) {
            setErrorMessage('Enter a valid deposit amount.');
            return;
          }
          if (!payload.registration_number) {
            setErrorMessage('Enter a registration number.');
            return;
          }
          setErrorMessage(undefined);
          createVehicle.mutate(payload, {
            onSuccess: (vehicle) =>
              router.replace({ pathname: '/fleet/[vehicleId]', params: { vehicleId: vehicle.id } }),
            onError: (error) => setErrorMessage(error.message),
          });
        }}
      />
    </Screen>
  );
}
