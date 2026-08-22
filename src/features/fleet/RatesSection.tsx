import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { Body } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import type { Database } from '../../lib/database.types';
import { useSetVehicleRate, useVehicleRates } from './queries';
import { laariToMvrText, mvrToLaari } from './VehicleForm';

type RateType = Database['public']['Enums']['rate_type'];

const RATE_LABELS: Record<RateType, string> = { hourly: 'Hourly rate', daily: 'Daily rate' };

function RateRow({
  vehicleId,
  rateType,
  amountLaari,
}: {
  vehicleId: string;
  rateType: RateType;
  amountLaari: number | null;
}) {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(laariToMvrText(amountLaari));
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const setRate = useSetVehicleRate();

  if (!isEditing) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Body>
          {RATE_LABELS[rateType]}:{' '}
          {amountLaari === null ? 'Not set' : `MVR ${(amountLaari / 100).toFixed(2)}`}
        </Body>
        <Button
          testID={`rate-${rateType}-edit`}
          label="Edit"
          variant="secondary"
          onPress={() => {
            setDraft(laariToMvrText(amountLaari));
            setIsEditing(true);
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <TextField
        testID={`rate-${rateType}-input`}
        label={`${RATE_LABELS[rateType]} (MVR)`}
        value={draft}
        onChangeText={setDraft}
        keyboardType="decimal-pad"
        errorMessage={errorMessage}
        editable={!setRate.isPending}
      />
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button
          testID={`rate-${rateType}-save`}
          label="Save"
          loading={setRate.isPending}
          onPress={() => {
            const amount = mvrToLaari(draft);
            if (amount === null) {
              setErrorMessage('Enter a valid amount.');
              return;
            }
            setErrorMessage(undefined);
            setRate.mutate(
              { vehicleId, rateType, amountLaari: amount === 0 ? null : amount },
              { onSuccess: () => setIsEditing(false), onError: (error) => setErrorMessage(error.message) },
            );
          }}
        />
        <Button
          testID={`rate-${rateType}-cancel`}
          label="Cancel"
          variant="secondary"
          onPress={() => setIsEditing(false)}
        />
      </View>
    </View>
  );
}

export function RatesSection({ vehicleId }: { vehicleId: string }) {
  const theme = useTheme();
  const rates = useVehicleRates(vehicleId);
  const hourly = rates.data?.find((r) => r.rate_type === 'hourly') ?? null;
  const daily = rates.data?.find((r) => r.rate_type === 'daily') ?? null;

  return (
    <View style={{ gap: theme.spacing.md }} testID="rates-section">
      <RateRow vehicleId={vehicleId} rateType="hourly" amountLaari={hourly?.amount_laari ?? null} />
      <RateRow vehicleId={vehicleId} rateType="daily" amountLaari={daily?.amount_laari ?? null} />
    </View>
  );
}
