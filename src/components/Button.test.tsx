import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '../design-system/ThemeProvider';
import { Button } from './Button';

function renderButton(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Button', () => {
  it('fires onPress when enabled', async () => {
    const onPress = jest.fn();
    await renderButton(<Button label="Save" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress while loading', async () => {
    const onPress = jest.fn();
    await renderButton(<Button label="Save" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('marks itself busy and disabled while loading, for assistive tech', async () => {
    await renderButton(<Button label="Save" onPress={jest.fn()} loading />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });
});
