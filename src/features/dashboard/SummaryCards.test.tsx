import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { SummaryCards } from './SummaryCards';

describe('SummaryCards', () => {
  it('renders each count under its own tile', async () => {
    await render(
      <ThemeProvider>
        <SummaryCards availableCount={5} rentedCount={3} awaitingApprovalCount={2} maintenanceCount={1} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('summary-available')).toHaveTextContent('5', { exact: false });
    expect(screen.getByTestId('summary-rented')).toHaveTextContent('3', { exact: false });
    expect(screen.getByTestId('summary-awaiting-approval')).toHaveTextContent('2', {
      exact: false,
    });
    expect(screen.getByTestId('summary-maintenance')).toHaveTextContent('1', { exact: false });
  });
});
