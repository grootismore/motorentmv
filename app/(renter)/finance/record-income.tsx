import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { Screen } from '../../../src/components/Screen';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { Body, Caption } from '../../../src/components/Typography';
import { TextField } from '../../../src/components/TextField';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { useOrgBookings } from '../../../src/features/bookings/queries';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';
import { useRecordTransaction, type PaymentMethod } from '../../../src/features/payments/queries';

// A starter taxonomy for income with nothing to attach it to -- same
// convention as record-expense.tsx's CATEGORIES (transactions.category is
// plain text, not yet an enum; see the standalone-income migration).
// Only shown when no booking is selected: a booking-linked payment
// already has context (which booking, which customer).
const CATEGORIES = ['Rental payment', 'Parts sale', 'Delivery fee', 'Deposit forfeiture', 'Other income'];

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'external_reference', label: 'External reference' },
];

/**
 * A standalone "record income" form -- transactions.booking_id is now
 * optional (20260821200001_transactions_standalone_income.sql), so this
 * no longer just routes to an existing booking's own PaymentLedger. A
 * booking can still be picked (submits exactly the same payment
 * PaymentLedger would record for it), but "No specific booking" is the
 * default: recording that requires financial access server-side (RLS),
 * surfaced here as a normal submit error if it's rejected, not a
 * client-side role check this screen can't reliably make.
 */
export default function RecordIncome() {
  const theme = useTheme();
  const router = useRouter();
  const { organizationId } = useCurrentOrganization();
  const bookings = useOrgBookings(organizationId, ['accepted', 'ready', 'active']);
  const recordTransaction = useRecordTransaction();

  const [bookingId, setBookingId] = useState<string>('none');
  const [category, setCategory] = useState(CATEGORIES[0] as string);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  if (bookings.isLoading) {
    return (
      <Screen title="Record income">
        <LoadingState label="Loading bookings…" />
      </Screen>
    );
  }

  if (bookings.isError) {
    return (
      <Screen title="Record income">
        <ErrorState message={bookings.error.message} onRetry={() => bookings.refetch()} />
      </Screen>
    );
  }

  const bookingOptions = [
    { value: 'none', label: 'No specific booking' },
    ...(bookings.data ?? []).map((b) => {
      const vehicle = b.vehicle;
      const vehicleName = vehicle
        ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || vehicle.registration_number
        : 'Unknown vehicle';
      return { value: b.id, label: `${vehicleName} — ${b.customer?.full_name ?? 'Customer'}` };
    }),
  ];

  const handleSubmit = () => {
    setErrorMessage(undefined);
    const parsed = Number(amount);
    if (!amount.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setErrorMessage('Enter an amount greater than zero.');
      return;
    }
    recordTransaction.mutate(
      {
        bookingId: bookingId === 'none' ? undefined : bookingId,
        organizationId,
        type: 'payment',
        method,
        amountLaari: Math.round(parsed * 100),
        reference: reference || undefined,
        note: note || undefined,
        category: bookingId === 'none' ? category : undefined,
      },
      {
        onSuccess: () => router.back(),
        onError: (error) => setErrorMessage(error.message),
      },
    );
  };

  return (
    <Screen title="Record income" scroll>
      <View style={{ gap: theme.spacing.lg }}>
        <ChipSelect
          testID="income-booking"
          label="Booking"
          options={bookingOptions}
          value={bookingId}
          onChange={setBookingId}
        />

        {bookingId === 'none' ? (
          <ChipSelect
            testID="income-category"
            label="Category"
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            value={category}
            onChange={setCategory}
          />
        ) : null}

        <ChipSelect
          testID="income-method"
          label="Method"
          options={METHOD_OPTIONS}
          value={method}
          onChange={setMethod}
        />

        <TextField
          testID="income-amount"
          label="Amount (MVR)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <TextField
          testID="income-reference"
          label="Reference (optional)"
          value={reference}
          onChangeText={setReference}
        />

        <TextField testID="income-note" label="Note (optional)" value={note} onChangeText={setNote} />

        <Caption testID="income-no-card-notice">
          Cash, bank transfer or an external reference only — no card details are collected here.
        </Caption>

        {errorMessage ? (
          <Body testID="income-form-error" color={theme.colors.destructive}>
            {errorMessage}
          </Body>
        ) : null}

        <Button
          testID="income-submit"
          label="Record income"
          loading={recordTransaction.isPending}
          onPress={handleSubmit}
        />
      </View>
    </Screen>
  );
}
