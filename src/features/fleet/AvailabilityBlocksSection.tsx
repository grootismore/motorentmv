import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../components/Button';
import { GlassSurface } from '../../components/GlassSurface';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { TextField } from '../../components/TextField';
import { Body, Caption } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { useAvailabilityBlocks, useCreateAvailabilityBlock, useDeleteAvailabilityBlock } from './queries';

function formatRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Dates are entered as ISO-ish local strings for the MVP (no native date
 * picker dependency yet) — `YYYY-MM-DD HH:mm`, parsed with `new Date()`.
 * Good enough for a renter blocking a vehicle for maintenance; a proper
 * calendar picker is a natural follow-up, not required for this feature
 * to be real and testable.
 */
function parseLocalDateTime(input: string): Date | null {
  const trimmed = input.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function AvailabilityBlocksSection({ vehicleId }: { vehicleId: string }) {
  const theme = useTheme();
  const blocks = useAvailabilityBlocks(vehicleId);
  const createBlock = useCreateAvailabilityBlock();
  const deleteBlock = useDeleteAvailabilityBlock(vehicleId);
  const [isAdding, setIsAdding] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleCreate = () => {
    const start = parseLocalDateTime(startsAt);
    const end = parseLocalDateTime(endsAt);
    if (!start || !end) {
      setErrorMessage('Enter dates as YYYY-MM-DD HH:mm.');
      return;
    }
    if (end <= start) {
      setErrorMessage('End must be after start.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Enter a reason (e.g. maintenance).');
      return;
    }
    setErrorMessage(undefined);
    createBlock.mutate(
      { vehicleId, startsAt: start.toISOString(), endsAt: end.toISOString(), reason: reason.trim() },
      {
        onSuccess: () => {
          setIsAdding(false);
          setStartsAt('');
          setEndsAt('');
          setReason('');
        },
        onError: (error) => setErrorMessage(error.message),
      },
    );
  };

  return (
    <View style={{ gap: theme.spacing.md }} testID="availability-blocks-section">
      {blocks.isLoading ? <LoadingState label="Loading blocks…" /> : null}
      {blocks.isError ? <ErrorState message={blocks.error.message} onRetry={() => blocks.refetch()} /> : null}
      {blocks.data && blocks.data.length === 0 && !isAdding ? (
        <EmptyState title="No blocks" message="This vehicle has no maintenance or manual holds." />
      ) : null}

      {blocks.data?.map((block) => (
        <GlassSurface
          key={block.id}
          testID={`availability-block-${block.id}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
            gap: theme.spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600' }}>{block.reason}</Body>
            <Caption>{formatRange(block.starts_at, block.ends_at)}</Caption>
          </View>
          <Button
            testID={`availability-block-${block.id}-delete`}
            label="Remove"
            variant="danger"
            onPress={() => deleteBlock.mutate(block.id)}
            loading={deleteBlock.isPending}
          />
        </GlassSurface>
      ))}

      {isAdding ? (
        <View style={{ gap: theme.spacing.sm }}>
          <TextField
            testID="availability-block-starts"
            label="Starts (YYYY-MM-DD HH:mm)"
            value={startsAt}
            onChangeText={setStartsAt}
            placeholder="2026-09-01 09:00"
          />
          <TextField
            testID="availability-block-ends"
            label="Ends (YYYY-MM-DD HH:mm)"
            value={endsAt}
            onChangeText={setEndsAt}
            placeholder="2026-09-01 17:00"
          />
          <TextField
            testID="availability-block-reason"
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="Brake service"
          />
          {errorMessage ? (
            <Caption
              testID="availability-block-error"
              accessibilityRole="alert"
              color={theme.colors.destructive}
            >
              {errorMessage}
            </Caption>
          ) : null}
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button
              testID="availability-block-save"
              label="Add block"
              onPress={handleCreate}
              loading={createBlock.isPending}
            />
            <Button
              testID="availability-block-cancel"
              label="Cancel"
              variant="secondary"
              onPress={() => setIsAdding(false)}
            />
          </View>
        </View>
      ) : (
        <Button
          testID="availability-block-add"
          label="Add block"
          variant="secondary"
          onPress={() => setIsAdding(true)}
        />
      )}
    </View>
  );
}
