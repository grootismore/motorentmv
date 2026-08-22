import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { ChipSelect } from '../../components/ChipSelect';
import { TextField } from '../../components/TextField';
import { useTheme } from '../../design-system/ThemeProvider';
import { formatMvr } from '../../lib/money';
import { useBooking } from '../bookings/queries';
import { useRecordTransaction, useTransactions, type PaymentMethod, type TransactionType } from './queries';

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'payment', label: 'Payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'adjustment', label: 'Adjustment' },
];

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'external_reference', label: 'External reference' },
];

const TYPE_LABEL: Record<TransactionType, string> = {
  payment: 'Payment',
  refund: 'Refund',
  adjustment: 'Adjustment',
};
const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  external_reference: 'External reference',
};

interface PaymentLedgerProps {
  bookingId: string;
  organizationId: string;
  /** 'renter' can record entries; 'customer' sees the same ledger
   * read-only, as their own receipt history. */
  viewerRole: 'renter' | 'customer';
}

/**
 * Manual payment ledger (PRD Prompt 6 / §6.4/§6.6): cash, bank transfer or
 * an external reference only. No payment-card field exists anywhere in
 * this component or the schema underneath it (transactions,
 * 20260821120015) -- MotoRent MV never touches card data.
 */
export function PaymentLedger({ bookingId, organizationId, viewerRole }: PaymentLedgerProps) {
  const theme = useTheme();
  const booking = useBooking(bookingId);
  const transactions = useTransactions(bookingId);
  const record = useRecordTransaction();

  const [type, setType] = useState<TransactionType>('payment');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  if (!transactions.data) return null;

  const totalPaid = transactions.data
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount_laari, 0);
  const totalRefunded = transactions.data
    .filter((t) => t.type === 'refund')
    .reduce((sum, t) => sum + t.amount_laari, 0);
  const totalAmount = booking.data?.total_amount_laari ?? null;
  const balanceDue = totalAmount != null ? totalAmount - totalPaid + totalRefunded : null;

  const handleSubmit = () => {
    setErrorMessage(undefined);
    const parsed = Number(amount);
    if (!amount.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setErrorMessage('Enter an amount greater than zero.');
      return;
    }
    record.mutate(
      {
        bookingId,
        organizationId,
        type,
        method: type === 'adjustment' ? null : method,
        amountLaari: Math.round(parsed * 100),
        reference: reference || undefined,
        note: note || undefined,
      },
      {
        onSuccess: () => {
          setAmount('');
          setReference('');
          setNote('');
        },
        onError: (error) => setErrorMessage(error.message),
      },
    );
  };

  return (
    <View style={{ gap: theme.spacing.md }} testID="payment-ledger">
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 }}>Payments</Text>

      <View style={{ gap: theme.spacing.xs }} testID="payment-ledger-summary">
        <Text style={{ color: theme.colors.textSecondary }}>Paid: {formatMvr(totalPaid)}</Text>
        {totalRefunded > 0 ? (
          <Text style={{ color: theme.colors.textSecondary }}>Refunded: {formatMvr(totalRefunded)}</Text>
        ) : null}
        {balanceDue != null ? (
          <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
            Balance due: {formatMvr(Math.max(balanceDue, 0))}
          </Text>
        ) : null}
      </View>

      {transactions.data.length > 0 ? (
        <View style={{ gap: theme.spacing.xs }} testID="payment-ledger-list">
          {transactions.data.map((t) => (
            <View key={t.id}>
              <Text style={{ color: theme.colors.textPrimary }}>
                {TYPE_LABEL[t.type]}: {formatMvr(t.amount_laari)}
                {t.method ? ` (${METHOD_LABEL[t.method]})` : ''}
              </Text>
              {t.reference ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Ref: {t.reference}</Text>
              ) : null}
              {t.note ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{t.note}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ color: theme.colors.textSecondary }}>No payments recorded yet.</Text>
      )}

      {viewerRole === 'renter' ? (
        <View style={{ gap: theme.spacing.sm }} testID="payment-ledger-form">
          <ChipSelect
            testID="payment-type"
            label="Type"
            options={TYPE_OPTIONS}
            value={type}
            onChange={setType}
          />
          {type !== 'adjustment' ? (
            <ChipSelect
              testID="payment-method"
              label="Method"
              options={METHOD_OPTIONS}
              value={method}
              onChange={setMethod}
            />
          ) : null}
          <TextField
            testID="payment-amount"
            label="Amount (MVR)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <TextField
            testID="payment-reference"
            label="Reference (optional)"
            value={reference}
            onChangeText={setReference}
          />
          <TextField testID="payment-note" label="Note (optional)" value={note} onChangeText={setNote} />

          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} testID="payment-no-card-notice">
            Cash, bank transfer or an external reference only — no card details are collected here.
          </Text>

          {errorMessage ? (
            <Text
              style={{ color: theme.colors.danger }}
              accessibilityRole="alert"
              testID="payment-ledger-error"
            >
              {errorMessage}
            </Text>
          ) : null}

          <Button
            testID="payment-submit"
            label={`Record ${TYPE_LABEL[type].toLowerCase()}`}
            onPress={handleSubmit}
            loading={record.isPending}
          />
        </View>
      ) : null}
    </View>
  );
}
