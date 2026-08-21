import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useTheme } from '../../design-system/ThemeProvider';
import {
  useAcceptBooking,
  useActivateBooking,
  useCancelBooking,
  useCompleteBooking,
  useDeclineBooking,
  useMarkBookingNeedsInfo,
  useReadyBooking,
  type Booking,
} from './queries';

type NotedAction = 'decline' | 'needs_info' | 'cancel';

/**
 * Which actions make sense from each status. `needs_info` has no "accept"
 * here: per the state machine (20260821120013), needs_info can only move
 * back to requested — which only the customer can do by resubmitting, and
 * there's no customer app yet (out of scope, PRD Prompt 3) — so an org
 * member can decline or cancel a needs_info booking but not accept it
 * directly.
 */
function actionsFor(status: Booking['status']): {
  direct: ('ready' | 'activate' | 'complete')[];
  noted: NotedAction[];
  canAccept: boolean;
} {
  switch (status) {
    case 'requested':
      return { direct: [], noted: ['decline', 'needs_info', 'cancel'], canAccept: true };
    case 'needs_info':
      return { direct: [], noted: ['decline', 'cancel'], canAccept: false };
    case 'accepted':
      return { direct: ['ready'], noted: ['cancel'], canAccept: false };
    case 'ready':
      return { direct: ['activate'], noted: ['cancel'], canAccept: false };
    case 'active':
      return { direct: ['complete'], noted: ['cancel'], canAccept: false };
    default:
      return { direct: [], noted: [], canAccept: false };
  }
}

const NOTED_LABEL: Record<NotedAction, string> = {
  decline: 'Decline',
  needs_info: 'Ask for more info',
  cancel: 'Cancel booking',
};

export function ActionPanel({ booking }: { booking: Booking }) {
  const theme = useTheme();
  const accept = useAcceptBooking();
  const decline = useDeclineBooking();
  const needsInfo = useMarkBookingNeedsInfo();
  const ready = useReadyBooking();
  const activate = useActivateBooking();
  const complete = useCompleteBooking();
  const cancel = useCancelBooking();

  const [notedAction, setNotedAction] = useState<NotedAction | null>(null);
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const { direct, noted, canAccept } = actionsFor(booking.status);
  const busy =
    accept.isPending ||
    decline.isPending ||
    needsInfo.isPending ||
    ready.isPending ||
    activate.isPending ||
    complete.isPending ||
    cancel.isPending;

  if (!canAccept && direct.length === 0 && noted.length === 0) {
    return null;
  }

  function runNotedAction() {
    setErrorMessage(undefined);
    const onError = (error: Error) => setErrorMessage(error.message);
    const onSuccess = () => {
      setNotedAction(null);
      setNote('');
    };
    if (notedAction === 'decline') {
      decline.mutate({ bookingId: booking.id, reason: note || undefined }, { onSuccess, onError });
    } else if (notedAction === 'needs_info') {
      needsInfo.mutate({ bookingId: booking.id, note: note || undefined }, { onSuccess, onError });
    } else if (notedAction === 'cancel') {
      cancel.mutate({ bookingId: booking.id, reason: note || undefined }, { onSuccess, onError });
    }
  }

  return (
    <View style={{ gap: theme.spacing.md }} testID="booking-action-panel">
      {errorMessage ? (
        <Text style={{ color: theme.colors.danger }} accessibilityRole="alert" testID="booking-action-error">
          {errorMessage}
        </Text>
      ) : null}

      {notedAction ? (
        <View style={{ gap: theme.spacing.sm }}>
          <TextField
            testID="booking-action-note"
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            editable={!busy}
          />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button
              testID="booking-action-confirm"
              label={`Confirm ${NOTED_LABEL[notedAction].toLowerCase()}`}
              variant={notedAction === 'decline' || notedAction === 'cancel' ? 'danger' : 'primary'}
              loading={busy}
              onPress={runNotedAction}
            />
            <Button
              testID="booking-action-dismiss"
              label="Back"
              variant="secondary"
              disabled={busy}
              onPress={() => {
                setNotedAction(null);
                setNote('');
                setErrorMessage(undefined);
              }}
            />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {canAccept ? (
            <Button
              testID="booking-action-accept"
              label="Accept"
              loading={accept.isPending}
              onPress={() => {
                setErrorMessage(undefined);
                accept.mutate(booking.id, { onError: (error) => setErrorMessage(error.message) });
              }}
            />
          ) : null}
          {direct.includes('ready') ? (
            <Button
              testID="booking-action-ready"
              label="Mark ready"
              loading={ready.isPending}
              onPress={() => {
                setErrorMessage(undefined);
                ready.mutate(booking.id, { onError: (error) => setErrorMessage(error.message) });
              }}
            />
          ) : null}
          {direct.includes('activate') ? (
            <Button
              testID="booking-action-activate"
              label="Start rental"
              loading={activate.isPending}
              onPress={() => {
                setErrorMessage(undefined);
                activate.mutate(booking.id, { onError: (error) => setErrorMessage(error.message) });
              }}
            />
          ) : null}
          {direct.includes('complete') ? (
            <Button
              testID="booking-action-complete"
              label="Complete"
              loading={complete.isPending}
              onPress={() => {
                setErrorMessage(undefined);
                complete.mutate(booking.id, { onError: (error) => setErrorMessage(error.message) });
              }}
            />
          ) : null}
          {noted.map((action) => (
            <Button
              key={action}
              testID={`booking-action-${action}`}
              label={NOTED_LABEL[action]}
              variant={action === 'decline' || action === 'cancel' ? 'danger' : 'secondary'}
              onPress={() => {
                setErrorMessage(undefined);
                setNotedAction(action);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
