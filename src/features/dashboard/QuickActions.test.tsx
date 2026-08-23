import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { QuickActions } from './QuickActions';

describe('QuickActions', () => {
  it('fires the matching callback for each action', async () => {
    const onAddVehicle = jest.fn();
    const onCreateBooking = jest.fn();
    const onRecordIncome = jest.fn();
    const onRecordExpense = jest.fn();

    await render(
      <ThemeProvider>
        <QuickActions
          onAddVehicle={onAddVehicle}
          onCreateBooking={onCreateBooking}
          onRecordIncome={onRecordIncome}
          onRecordExpense={onRecordExpense}
        />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId('quick-action-add-vehicle'));
    await fireEvent.press(screen.getByTestId('quick-action-create-booking'));
    await fireEvent.press(screen.getByTestId('quick-action-record-income'));
    await fireEvent.press(screen.getByTestId('quick-action-record-expense'));

    expect(onAddVehicle).toHaveBeenCalledTimes(1);
    expect(onCreateBooking).toHaveBeenCalledTimes(1);
    expect(onRecordIncome).toHaveBeenCalledTimes(1);
    expect(onRecordExpense).toHaveBeenCalledTimes(1);
  });
});
