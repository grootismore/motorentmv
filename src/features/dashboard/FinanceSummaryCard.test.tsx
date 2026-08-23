import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import type { FinanceSummary } from '../finance/queries';
import { FinanceSummaryCard } from './FinanceSummaryCard';

function summary(overrides: Partial<FinanceSummary> = {}): FinanceSummary {
  return {
    incomeThisMonthLaari: 100000,
    expensesThisMonthLaari: 30000,
    netProfitLaari: 70000,
    incomeChangePercent: 20,
    expensesChangePercent: -10,
    netChangePercent: null,
    ...overrides,
  };
}

describe('FinanceSummaryCard', () => {
  it('shows income, expenses and net profit as formatted MVR', async () => {
    await render(
      <ThemeProvider>
        <FinanceSummaryCard summary={summary()} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('finance-income-row')).toHaveTextContent('MVR 1,000.00', {
      exact: false,
    });
    expect(screen.getByTestId('finance-expenses-row')).toHaveTextContent('MVR 300.00', {
      exact: false,
    });
    expect(screen.getByTestId('finance-net-profit-row')).toHaveTextContent('MVR 700.00', {
      exact: false,
    });
  });

  it('shows a signed percent change when there is a prior-month baseline', async () => {
    await render(
      <ThemeProvider>
        <FinanceSummaryCard summary={summary()} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('finance-income-row')).toHaveTextContent('+20% vs last month', {
      exact: false,
    });
    expect(screen.getByTestId('finance-expenses-row')).toHaveTextContent('-10% vs last month', {
      exact: false,
    });
  });

  it('shows "No prior data" instead of a fabricated percent from a zero baseline', async () => {
    await render(
      <ThemeProvider>
        <FinanceSummaryCard summary={summary({ netChangePercent: null })} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('finance-net-profit-row')).toHaveTextContent('No prior data', {
      exact: false,
    });
  });
});
