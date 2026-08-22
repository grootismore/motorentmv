import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { SearchForm } from './SearchForm';

async function renderForm(onSubmit: jest.Mock, extraProps: Record<string, unknown> = {}) {
  return render(
    <ThemeProvider>
      <SearchForm onSubmit={onSubmit} {...extraProps} />
    </ThemeProvider>,
  );
}

/** Opens the iOS inline date picker for a field, then fires the
 * underlying native picker's change event exactly as the real native
 * module would — `{ nativeEvent: { timestamp } }`, which
 * @react-native-community/datetimepicker's own onChange wrapper reads to
 * construct the picked Date (see datetimepicker.ios.js's `_onChange`).
 * Reading the picked Date back via its *local* getters (getFullYear,
 * getHours, etc.) is exactly what DateRangeSelector does with a real
 * device picker, so constructing/reading `picked` via `new Date(y, m, d,
 * h, min)` round-trips correctly regardless of the test runner's own time
 * zone. */
async function pickDate(testID: string, picked: Date) {
  await fireEvent.press(screen.getByTestId(testID));
  await fireEvent(screen.getByTestId(`${testID}-date-picker`), 'change', {
    nativeEvent: { timestamp: picked.getTime() },
  });
}

async function pickTime(testID: string, picked: Date) {
  await fireEvent(screen.getByTestId(`${testID}-time-picker`), 'change', {
    nativeEvent: { timestamp: picked.getTime() },
  });
}

describe('SearchForm', () => {
  it('submits UTC instants converted from Maldives-local picker input', async () => {
    const onSubmit = jest.fn();
    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByTestId('search-form-location'), 'Hulhumale');

    // Picking Sep 1 / 09:00 on the pickup field's wheel.
    await pickDate('search-form-starts', new Date(2026, 8, 1, 9, 0));
    await pickTime('search-form-starts', new Date(2026, 8, 1, 9, 0));
    // Picking Sep 2 / 09:00 on the return field's wheel.
    await pickDate('search-form-ends', new Date(2026, 8, 2, 9, 0));
    await pickTime('search-form-ends', new Date(2026, 8, 2, 9, 0));

    await fireEvent.press(screen.getByTestId('search-form-submit'));

    // 09:00 Maldives (UTC+5) on Sep 1 is 04:00 UTC the same day.
    expect(onSubmit).toHaveBeenCalledWith({
      location: 'Hulhumale',
      startsAtUtc: '2026-09-01T04:00:00.000Z',
      endsAtUtc: '2026-09-02T04:00:00.000Z',
    });
  });

  it('rejects a return before pickup', async () => {
    const onSubmit = jest.fn();
    await renderForm(onSubmit);

    await pickDate('search-form-starts', new Date(2026, 8, 2, 9, 0));
    await pickTime('search-form-starts', new Date(2026, 8, 2, 9, 0));
    await pickDate('search-form-ends', new Date(2026, 8, 1, 9, 0));
    await pickTime('search-form-ends', new Date(2026, 8, 1, 9, 0));

    await fireEvent.press(screen.getByTestId('search-form-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('search-form-error')).toBeTruthy();
  });

  it('pre-fills from initial UTC values, displayed in Maldives time', async () => {
    await renderForm(jest.fn(), {
      initialStartsAtUtc: '2026-09-01T04:00:00.000Z',
      initialEndsAtUtc: '2026-09-02T04:00:00.000Z',
    });

    // 04:00 UTC on Sep 1 is 09:00 Maldives the same day.
    expect(screen.getByTestId('search-form-starts')).toHaveTextContent('9:00 AM', { exact: false });
    expect(screen.getByTestId('search-form-ends')).toHaveTextContent('9:00 AM', { exact: false });
  });
});
