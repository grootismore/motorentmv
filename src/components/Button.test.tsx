import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { lightColors } from '../design-system/tokens';
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

  // Regression coverage for a real device bug: a disabled/loading primary
  // button used to fade its own enabled-state colors (near-black text on
  // bright teal) via a blanket opacity: 0.5, which over a dark page
  // background blended text and fill toward the *same* dark color instead
  // of two visibly different ones -- illegible, not just dim. Disabled/
  // loading now use the dedicated `disabled`/`textSecondary` tokens at
  // full opacity instead of a fade of the enabled palette.
  it('uses the dedicated disabled color at full opacity, not a fade of the enabled color, once disabled', async () => {
    await renderButton(<Button label="Save" onPress={jest.fn()} disabled />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveStyle({ backgroundColor: lightColors.disabled, opacity: 1 });
  });

  it('uses the dedicated disabled color at full opacity while loading too', async () => {
    await renderButton(<Button label="Save" onPress={jest.fn()} loading />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveStyle({ backgroundColor: lightColors.disabled, opacity: 1 });
  });
});
