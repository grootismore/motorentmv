import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '../design-system/ThemeProvider';
import { Button } from './Button';

function renderButton(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

// Button is now a real native SwiftUI/Jetpack Compose view (@expo/ui), not
// a Pressable drawn to look like one. In this JS-only test environment
// there's no real native view behind it -- RN's own generic native-view
// mock stands in, which preserves testID/label as plain props but does
// NOT enforce `disabled` (unlike a real on-device SwiftUI Button, which
// genuinely won't dispatch a tap). That's why Button.tsx itself withholds
// `onPress` when disabled/loading rather than relying solely on the
// native `disabled` prop -- these tests verify that JS-level guard, which
// is also what actually makes "does not fire while loading" true here.
describe('Button', () => {
  it('fires onPress when enabled', async () => {
    const onPress = jest.fn();
    await renderButton(<Button label="Save" onPress={onPress} testID="save-button" />);
    fireEvent.press(screen.getByTestId('save-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress while loading', async () => {
    const onPress = jest.fn();
    await renderButton(<Button label="Save" onPress={onPress} loading testID="save-button" />);
    fireEvent.press(screen.getByTestId('save-button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire onPress while explicitly disabled', async () => {
    const onPress = jest.fn();
    await renderButton(<Button label="Save" onPress={onPress} disabled testID="save-button" />);
    fireEvent.press(screen.getByTestId('save-button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a loading indicator instead of the label while loading', async () => {
    await renderButton(<Button label="Save" onPress={jest.fn()} loading testID="save-button" />);
    expect(screen.getByTestId('save-button-loading')).toBeTruthy();
  });
});
