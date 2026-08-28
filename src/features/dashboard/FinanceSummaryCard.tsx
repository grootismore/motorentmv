import { View } from 'react-native';

import { GroupedRow, GroupedSection } from '../../components/GroupedSection';
import { Body, Caption } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import type { FinanceSummary } from '../finance/queries';
import { formatMvr } from '../../lib/money';

function ChangeBadge({ percent }: { percent: number | null }) {
  const theme = useTheme();
  if (percent === null) {
    return <Caption>No prior data</Caption>;
  }
  const isUp = percent > 0;
  const isFlat = percent === 0;
  const color = isFlat ? theme.colors.textTertiary : isUp ? theme.colors.success : theme.colors.destructive;
  const sign = isFlat ? '' : isUp ? '+' : '';
  return (
    <Caption style={{ color, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
      {sign}
      {percent}% vs last month
    </Caption>
  );
}

function FinanceRow({
  label,
  amountLaari,
  changePercent,
  isLast,
  testID,
}: {
  label: string;
  amountLaari: number;
  changePercent: number | null;
  isLast?: boolean;
  testID: string;
}) {
  const theme = useTheme();
  return (
    <GroupedRow isLast={isLast} testID={testID}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Body>{label}</Body>
          <ChangeBadge percent={changePercent} />
        </View>
        <Body style={{ fontWeight: '700', color: theme.colors.textPrimary, fontVariant: ['tabular-nums'] }}>
          {formatMvr(amountLaari)}
        </Body>
      </View>
    </GroupedRow>
  );
}

export function FinanceSummaryCard({ summary }: { summary: FinanceSummary }) {
  return (
    <GroupedSection title="Finance this month" testID="dashboard-finance-summary">
      <FinanceRow
        testID="finance-income-row"
        label="Income"
        amountLaari={summary.incomeThisMonthLaari}
        changePercent={summary.incomeChangePercent}
      />
      <FinanceRow
        testID="finance-expenses-row"
        label="Expenses"
        amountLaari={summary.expensesThisMonthLaari}
        changePercent={summary.expensesChangePercent}
      />
      <FinanceRow
        testID="finance-net-profit-row"
        label="Net profit"
        amountLaari={summary.netProfitLaari}
        changePercent={summary.netChangePercent}
        isLast
      />
    </GroupedSection>
  );
}
