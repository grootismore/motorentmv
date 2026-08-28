import { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { Button } from '../../components/Button';
import { GlassSurface } from '../../components/GlassSurface';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { TextField } from '../../components/TextField';
import { Body, Caption, Label } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { formatMaldivesDate, maldivesDateKey } from '../../lib/datetime';
import { formatMvr } from '../../lib/money';
import { mvrToLaari } from './VehicleForm';
import { useCreateMaintenanceRecord, useDeleteMaintenanceRecord, useMaintenanceRecords } from './queries';

function ServiceDatePicker({ valueIso, onChange }: { valueIso: string; onChange: (iso: string) => void }) {
  const theme = useTheme();
  const [showIosPicker, setShowIosPicker] = useState(false);
  const value = new Date(`${valueIso}T00:00:00`);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (_event, picked) => {
          if (!picked) return;
          onChange(maldivesDateKey(picked.toISOString()));
        },
      });
    } else {
      setShowIosPicker(true);
    }
  };

  return (
    <View>
      <Label style={{ marginBottom: theme.spacing.xs }}>Date performed</Label>
      <Pressable
        testID="maintenance-date-field"
        accessibilityRole="button"
        accessibilityLabel={`Date performed: ${formatMaldivesDate(value.toISOString())}`}
        onPress={open}
      >
        <GlassSurface style={{ paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md }}>
          <Body>{formatMaldivesDate(value.toISOString())}</Body>
        </GlassSurface>
      </Pressable>
      {Platform.OS === 'ios' && showIosPicker ? (
        <DateTimePicker
          testID="maintenance-date-picker"
          value={value}
          mode="date"
          display="inline"
          maximumDate={new Date()}
          onValueChange={(_event, picked) => {
            onChange(maldivesDateKey(picked.toISOString()));
            setShowIosPicker(false);
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * A completed-service log, not a predictive maintenance schedule -- there
 * is no due-date/interval concept in this schema (see SummaryCards.tsx's
 * own doc comment on the dashboard's "maintenance due" tile). Any org
 * member can read this history; only owner/manager record or correct an
 * entry (mirrors vehicles' own access split -- see the
 * vehicle_maintenance_records migration).
 */
export function MaintenanceSection({
  vehicleId,
  organizationId,
}: {
  vehicleId: string;
  organizationId: string;
}) {
  const theme = useTheme();
  const records = useMaintenanceRecords(vehicleId);
  const createRecord = useCreateMaintenanceRecord();
  const deleteRecord = useDeleteMaintenanceRecord(vehicleId);
  const [isAdding, setIsAdding] = useState(false);
  const [description, setDescription] = useState('');
  const [costText, setCostText] = useState('');
  const [odometerText, setOdometerText] = useState('');
  const [performedOn, setPerformedOn] = useState(() => maldivesDateKey(new Date().toISOString()));
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const confirmDelete = (record: { id: string; description: string }) => {
    Alert.alert('Remove this entry?', `"${record.description}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteRecord.mutate(record.id) },
    ]);
  };

  const resetForm = () => {
    setIsAdding(false);
    setDescription('');
    setCostText('');
    setOdometerText('');
    setPerformedOn(maldivesDateKey(new Date().toISOString()));
  };

  const handleCreate = () => {
    if (!description.trim()) {
      setErrorMessage('Describe what was done (e.g. oil change).');
      return;
    }
    const costLaari = costText.trim() ? mvrToLaari(costText) : 0;
    if (costLaari === null) {
      setErrorMessage('Enter a valid cost, or leave it blank.');
      return;
    }
    let odometerKmAtService: number | null = null;
    if (odometerText.trim()) {
      const parsed = Number(odometerText.trim());
      if (!Number.isInteger(parsed) || parsed < 0) {
        setErrorMessage('Enter a valid odometer reading, or leave it blank.');
        return;
      }
      odometerKmAtService = parsed;
    }
    setErrorMessage(undefined);
    createRecord.mutate(
      {
        organizationId,
        vehicleId,
        description: description.trim(),
        costLaari: costText.trim() ? costLaari : null,
        odometerKmAtService,
        performedOn,
      },
      {
        onSuccess: resetForm,
        onError: (error) => setErrorMessage(error.message),
      },
    );
  };

  return (
    <View style={{ gap: theme.spacing.md }} testID="maintenance-section">
      {records.isLoading ? <LoadingState label="Loading maintenance history…" /> : null}
      {records.isError ? (
        <ErrorState message={records.error.message} onRetry={() => records.refetch()} />
      ) : null}
      {records.data && records.data.length === 0 && !isAdding ? (
        <EmptyState
          title="No service history"
          message="Completed maintenance for this vehicle will appear here."
        />
      ) : null}

      {records.data?.map((record) => (
        <GlassSurface
          key={record.id}
          testID={`maintenance-record-${record.id}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
            gap: theme.spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600' }}>{record.description}</Body>
            <Caption style={{ fontVariant: ['tabular-nums'] }}>
              {formatMaldivesDate(`${record.performed_on}T00:00:00Z`)}
              {record.odometer_km_at_service !== null
                ? ` · ${record.odometer_km_at_service.toLocaleString()} km`
                : ''}
              {record.cost_laari !== null ? ` · ${formatMvr(record.cost_laari)}` : ''}
            </Caption>
          </View>
          <Button
            testID={`maintenance-record-${record.id}-delete`}
            label="Remove"
            variant="danger"
            onPress={() => confirmDelete(record)}
            loading={deleteRecord.isPending}
          />
        </GlassSurface>
      ))}

      {isAdding ? (
        <View style={{ gap: theme.spacing.sm }}>
          <TextField
            testID="maintenance-description"
            label="What was done"
            value={description}
            onChangeText={setDescription}
            placeholder="Oil change and brake pads"
          />
          <ServiceDatePicker valueIso={performedOn} onChange={setPerformedOn} />
          <TextField
            testID="maintenance-odometer"
            label="Odometer at service (km, optional)"
            value={odometerText}
            onChangeText={setOdometerText}
            placeholder="12000"
            keyboardType="number-pad"
          />
          <TextField
            testID="maintenance-cost"
            label="Cost (MVR, optional)"
            value={costText}
            onChangeText={setCostText}
            placeholder="850"
            keyboardType="decimal-pad"
          />
          {errorMessage ? (
            <Caption testID="maintenance-error" accessibilityRole="alert" color={theme.colors.destructive}>
              {errorMessage}
            </Caption>
          ) : null}
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button
              testID="maintenance-save"
              label="Save entry"
              onPress={handleCreate}
              loading={createRecord.isPending}
            />
            <Button testID="maintenance-cancel" label="Cancel" variant="secondary" onPress={resetForm} />
          </View>
        </View>
      ) : (
        <Button
          testID="maintenance-add"
          label="Log maintenance"
          variant="secondary"
          onPress={() => setIsAdding(true)}
        />
      )}
    </View>
  );
}
