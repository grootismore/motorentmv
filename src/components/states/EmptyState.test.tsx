import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { EmptyState } from './EmptyState';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('EmptyState', () => {
  it('renders the title and message', async () => {
    await renderWithTheme(<EmptyState title="No listings yet" message="Check back soon." />);

    expect(screen.getByText('No listings yet')).toBeTruthy();
    expect(screen.getByText('Check back soon.')).toBeTruthy();
  });

  it('renders an accessible action button when provided', async () => {
    const onAction = jest.fn();
    await renderWithTheme(<EmptyState title="No listings yet" actionLabel="Refresh" onAction={onAction} />);

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
  });
});
