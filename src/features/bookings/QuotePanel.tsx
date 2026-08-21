import { Text, View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import { formatMvr } from '../../lib/money';
import type { BookingQuote } from './queries';

const RATE_LABEL: Record<BookingQuote['rate_type'], string> = { hourly: 'hour', daily: 'day' };

export function QuotePanel({ quote, frozen }: { quote: BookingQuote; frozen: boolean }) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }} testID="booking-quote-panel">
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
        {frozen ? 'Quote (frozen at acceptance)' : 'Estimated quote if accepted'}
      </Text>
      <Text style={{ color: theme.colors.textPrimary }}>
        {formatMvr(quote.rate_amount_laari)} × {quote.units} {RATE_LABEL[quote.rate_type]}
        {quote.units === 1 ? '' : 's'} = {formatMvr(quote.subtotal_laari)}
      </Text>
      {quote.discount_laari > 0 ? (
        <Text style={{ color: theme.colors.textSecondary }}>
          Discount: −{formatMvr(quote.discount_laari)}
        </Text>
      ) : null}
      {quote.delivery_fee_laari > 0 ? (
        <Text style={{ color: theme.colors.textSecondary }}>
          Delivery fee: {formatMvr(quote.delivery_fee_laari)}
        </Text>
      ) : null}
      <Text style={[{ color: theme.colors.textPrimary, fontWeight: '700' }]}>
        Total: {formatMvr(quote.total_laari)}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
        Refundable deposit: {formatMvr(quote.deposit_amount_laari)}
      </Text>
    </View>
  );
}
