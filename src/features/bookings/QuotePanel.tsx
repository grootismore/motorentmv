import { View } from 'react-native';

import { Body, Caption, PriceText } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { formatMvr } from '../../lib/money';
import type { BookingQuote } from './queries';

const RATE_LABEL: Record<BookingQuote['rate_type'], string> = { hourly: 'hour', daily: 'day' };

export function QuotePanel({ quote, frozen }: { quote: BookingQuote; frozen: boolean }) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }} testID="booking-quote-panel">
      <Caption>{frozen ? 'Quote (frozen at acceptance)' : 'Estimated quote if accepted'}</Caption>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Body style={{ fontVariant: ['tabular-nums'] }}>
          {formatMvr(quote.rate_amount_laari)} × {quote.units} {RATE_LABEL[quote.rate_type]}
          {quote.units === 1 ? '' : 's'}
        </Body>
        <Body style={{ fontVariant: ['tabular-nums'] }}>{formatMvr(quote.subtotal_laari)}</Body>
      </View>
      {quote.discount_laari > 0 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Caption>Discount</Caption>
          <Caption style={{ fontVariant: ['tabular-nums'] }}>−{formatMvr(quote.discount_laari)}</Caption>
        </View>
      ) : null}
      {quote.delivery_fee_laari > 0 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Caption>Delivery fee</Caption>
          <Caption style={{ fontVariant: ['tabular-nums'] }}>{formatMvr(quote.delivery_fee_laari)}</Caption>
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: theme.spacing.xs,
          marginTop: theme.spacing.xs,
          borderTopWidth: 1,
          borderTopColor: theme.colors.divider,
        }}
      >
        <Body style={{ fontWeight: '700' }}>Total</Body>
        <PriceText>{formatMvr(quote.total_laari)}</PriceText>
      </View>
      <Caption style={{ fontVariant: ['tabular-nums'] }}>
        Refundable deposit: {formatMvr(quote.deposit_amount_laari)}
      </Caption>
    </View>
  );
}
