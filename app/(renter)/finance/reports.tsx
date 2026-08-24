import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { GroupedRow, GroupedSection } from '../../../src/components/GroupedSection';
import { Screen } from '../../../src/components/Screen';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { Body, Caption } from '../../../src/components/Typography';
import { minTouchTarget } from '../../../src/design-system/tokens';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { buildFinanceReportCsv } from '../../../src/features/finance/csv';
import {
  useFinanceReport,
  useOrgExpensesInRange,
  useOrgTransactionsInRange,
} from '../../../src/features/finance/queries';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';
import {
  maldivesMonthRange,
  maldivesYearMonth,
  nextMaldivesMonth,
  previousMaldivesMonth,
} from '../../../src/lib/datetime';
import { formatMvr } from '../../../src/lib/money';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * A month-at-a-time finance report (Prompt 11): income by source (booking
 * payments, refunds, standalone income by category) and expenses by
 * category, for whichever month the renter navigates to -- the dashboard's
 * FinanceSummaryCard only ever shows the current month at a glance; this
 * is the "look back at a specific month" screen. Also offers a line-item
 * CSV export of the same month via the native share sheet.
 */
export default function FinanceReports() {
  const theme = useTheme();
  const { organizationId } = useCurrentOrganization();
  const [{ year, month }, setPeriod] = useState(() => maldivesYearMonth(new Date().toISOString()));
  const report = useFinanceReport(organizationId, year, month);

  const range = maldivesMonthRange(year, month);
  const transactionsQuery = useOrgTransactionsInRange(organizationId, range);
  const expensesQuery = useOrgExpensesInRange(organizationId, range);

  const [isExporting, setIsExporting] = useState(false);

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const handleExport = async () => {
    if (!transactionsQuery.data || !expensesQuery.data) return;
    setIsExporting(true);
    try {
      const csv = buildFinanceReportCsv(transactionsQuery.data, expensesQuery.data);
      const file = new File(Paths.cache, `finance-report-${year}-${String(month).padStart(2, '0')}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
          dialogTitle: `Finance report – ${monthLabel}`,
        });
      } else {
        Alert.alert('Sharing unavailable', 'This device cannot share files. Try again from another device.');
      }
    } catch {
      Alert.alert('Export failed', 'The report could not be exported. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Screen
      title="Finance reports"
      titleStyle="compact"
      scroll
      headerRight={
        <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
          <Pressable
            testID="reports-prev-month"
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => setPeriod(previousMaldivesMonth(year, month))}
            style={{
              minWidth: minTouchTarget,
              minHeight: minTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <Pressable
            testID="reports-next-month"
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => setPeriod(nextMaldivesMonth(year, month))}
            style={{
              minWidth: minTouchTarget,
              minHeight: minTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-forward" size={22} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      }
    >
      <Body testID="reports-month-label" style={{ fontWeight: '700', marginBottom: theme.spacing.md }}>
        {monthLabel}
      </Body>

      <View style={{ alignItems: 'flex-start', marginBottom: theme.spacing.lg }}>
        <Button
          testID="reports-export-csv"
          label="Export CSV"
          variant="secondary"
          loading={isExporting}
          disabled={!transactionsQuery.data || !expensesQuery.data}
          onPress={handleExport}
        />
      </View>

      {report.isLoading ? <LoadingState label="Loading report…" /> : null}
      {report.isError ? (
        <ErrorState message={report.error?.message} onRetry={() => report.refetch()} />
      ) : null}

      {report.data ? (
        <View style={{ gap: theme.spacing.lg }}>
          <GroupedSection title="Summary" tone="strong" testID="reports-summary">
            <GroupedRow testID="reports-income-row">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Body>Income</Body>
                <Body style={{ fontWeight: '600' }}>{formatMvr(report.data.incomeLaari)}</Body>
              </View>
            </GroupedRow>
            <GroupedRow testID="reports-expenses-row">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Body>Expenses</Body>
                <Body style={{ fontWeight: '600' }}>{formatMvr(report.data.expensesLaari)}</Body>
              </View>
            </GroupedRow>
            <GroupedRow testID="reports-net-row" isLast>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Body>Net profit</Body>
                <Body style={{ fontWeight: '700', color: theme.colors.lagoonPrimary }}>
                  {formatMvr(report.data.netProfitLaari)}
                </Body>
              </View>
            </GroupedRow>
          </GroupedSection>

          <GroupedSection title="Income by source" testID="reports-income-breakdown">
            {report.data.incomeBySource.bookingPaymentsLaari === 0 &&
            report.data.incomeBySource.refundsLaari === 0 &&
            report.data.incomeBySource.standalone.length === 0 ? (
              <Caption>No income recorded this month.</Caption>
            ) : (
              <View>
                {report.data.incomeBySource.bookingPaymentsLaari > 0 ? (
                  <GroupedRow testID="reports-booking-payments-row">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Body>Booking payments</Body>
                      <Body>{formatMvr(report.data.incomeBySource.bookingPaymentsLaari)}</Body>
                    </View>
                  </GroupedRow>
                ) : null}
                {report.data.incomeBySource.refundsLaari > 0 ? (
                  <GroupedRow testID="reports-refunds-row">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Body>Refunds</Body>
                      <Body>-{formatMvr(report.data.incomeBySource.refundsLaari)}</Body>
                    </View>
                  </GroupedRow>
                ) : null}
                {report.data.incomeBySource.standalone.map((entry, index) => (
                  <GroupedRow
                    key={entry.category}
                    testID={`reports-standalone-${entry.category}`}
                    isLast={index === report.data!.incomeBySource.standalone.length - 1}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Body>{entry.category}</Body>
                      <Body>{formatMvr(entry.amountLaari)}</Body>
                    </View>
                  </GroupedRow>
                ))}
              </View>
            )}
          </GroupedSection>

          <GroupedSection title="Expenses by category" testID="reports-expense-breakdown">
            {report.data.expensesByCategory.length === 0 ? (
              <Caption>No expenses recorded this month.</Caption>
            ) : (
              <View>
                {report.data.expensesByCategory.map((entry, index) => (
                  <GroupedRow
                    key={entry.category}
                    testID={`reports-expense-${entry.category}`}
                    isLast={index === report.data!.expensesByCategory.length - 1}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Body>{entry.category}</Body>
                      <Body>{formatMvr(entry.amountLaari)}</Body>
                    </View>
                  </GroupedRow>
                ))}
              </View>
            )}
          </GroupedSection>
        </View>
      ) : null}
    </Screen>
  );
}
