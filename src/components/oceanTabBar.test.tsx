import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../design-system/ThemeProvider';
import { oceanTabBarButton } from './oceanTabBar';

/**
 * Guards against regressing to tabBarIcon for this: react-navigation
 * renders whatever a Tabs.Screen's tabBarIcon returns inside a small
 * fixed-size icon box (TabBarIcon's wrapperUikit* styles, ~23-31pt wide),
 * meant for an icon alone. A label rendered inside that box wraps
 * letter-by-letter instead of stayed on one line — confirmed from a
 * physical-device screenshot showing "Explore"/"Bookings"/etc reduced to
 * vertical single-character columns. oceanTabBarButton must be wired to
 * Tabs.Screen's tabBarButton option instead, which receives the real
 * evenly-divided flex slot the whole tab item gets.
 */
describe('oceanTabBarButton', () => {
  it('renders the full, un-truncated label on one line', async () => {
    const TabButton = oceanTabBarButton('compass-outline', 'compass', 'Bookings');
    await render(
      <ThemeProvider>
        <TabButton />
      </ThemeProvider>,
    );

    const label = screen.getByText('Bookings');
    expect(label).toBeTruthy();
    expect(label.props.numberOfLines).toBe(1);
  });

  it('reflects aria-selected in accessibilityState and fires onPress', async () => {
    const TabButton = oceanTabBarButton('compass-outline', 'compass', 'Explore');
    const onPress = jest.fn();
    await render(
      <ThemeProvider>
        <TabButton onPress={onPress} aria-selected aria-label="Explore" />
      </ThemeProvider>,
    );

    const tab = screen.getByRole('tab');
    expect(tab.props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(tab);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
