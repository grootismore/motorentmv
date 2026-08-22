import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { SearchForm } from './SearchForm';

async function renderForm(onSubmit: jest.Mock) {
  return render(
    <ThemeProvider>
      <SearchForm onSubmit={onSubmit} />
    </ThemeProvider>,
  );
}

describe('SearchForm', () => {
  it('submits UTC instants converted from Maldives-local input', async () => {
    const onSubmit = jest.fn();
    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByTestId('search-form-location'), 'Hulhumale');
    await fireEvent.changeText(screen.getByTestId('search-form-starts'), '2026-09-01 09:00');
    await fireEvent.changeText(screen.getByTestId('search-form-ends'), '2026-09-02 09:00');
    await fireEvent.press(screen.getByTestId('search-form-submit'));

    // 09:00 Maldives (UTC+5) on Sep 1 is 04:00 UTC the same day.
    expect(onSubmit).toHaveBeenCalledWith({
      location: 'Hulhumale',
      startsAtUtc: '2026-09-01T04:00:00.000Z',
      endsAtUtc: '2026-09-02T04:00:00.000Z',
    });
  });

  it('rejects an unparseable date instead of submitting', async () => {
    const onSubmit = jest.fn();
    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByTestId('search-form-starts'), 'not a date');
    await fireEvent.press(screen.getByTestId('search-form-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('search-form-error')).toBeTruthy();
  });

  it('rejects a return before pickup', async () => {
    const onSubmit = jest.fn();
    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByTestId('search-form-starts'), '2026-09-02 09:00');
    await fireEvent.changeText(screen.getByTestId('search-form-ends'), '2026-09-01 09:00');
    await fireEvent.press(screen.getByTestId('search-form-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('search-form-error')).toBeTruthy();
  });

  it('pre-fills from initial UTC values, displayed in Maldives time', async () => {
    await render(
      <ThemeProvider>
        <SearchForm
          onSubmit={jest.fn()}
          initialStartsAtUtc="2026-09-01T04:00:00.000Z"
          initialEndsAtUtc="2026-09-02T04:00:00.000Z"
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('search-form-starts').props.value).toBe('2026-09-01 09:00');
    expect(screen.getByTestId('search-form-ends').props.value).toBe('2026-09-02 09:00');
  });
});
