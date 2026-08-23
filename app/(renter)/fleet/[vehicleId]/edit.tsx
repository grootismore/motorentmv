import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Screen } from '../../../../src/components/Screen';
import { ErrorState } from '../../../../src/components/states/ErrorState';
import { LoadingState } from '../../../../src/components/states/LoadingState';
import { useUpdateVehicle, useVehicle } from '../../../../src/features/fleet/queries';
import {
  VehicleForm,
  laariToMvrText,
  vehicleFormToInsert,
  type VehicleFormValues,
} from '../../../../src/features/fleet/VehicleForm';

export default function EditVehicle() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicle = useVehicle(vehicleId);
  const updateVehicle = useUpdateVehicle(vehicleId as string);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

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
  const initialValues: Partial<VehicleFormValues> = {
    registration_number: v.registration_number,
    internal_code: v.internal_code ?? '',
    make: v.make ?? '',
    model: v.model ?? '',
    year: v.year?.toString() ?? '',
    category: v.category ?? '',
    engine_size_cc: v.engine_size_cc?.toString() ?? '',
    color: v.color ?? '',
    transmission: v.transmission ?? 'automatic',
    status: v.status,
    odometer_km: v.odometer_km.toString(),
    deposit_amount_laari: laariToMvrText(v.deposit_amount_laari),
    location: v.location ?? '',
    included_accessories: v.included_accessories.join(', '),
  };

  return (
    <Screen title="Edit vehicle" scroll>
      <VehicleForm
        testIDPrefix="edit-vehicle"
        submitLabel="Save changes"
        initialValues={initialValues}
        isSubmitting={updateVehicle.isPending}
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
          updateVehicle.mutate(payload, {
            onSuccess: () => router.replace({ pathname: '/fleet/[vehicleId]', params: { vehicleId: v.id } }),
            onError: (error) => setErrorMessage(error.message),
          });
        }}
      />
    </Screen>
  );
}
