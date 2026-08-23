import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../design-system/ThemeProvider';
import { CustomerGlassTabBar, type CustomerGlassTabBarProps } from './CustomerGlassTabBar';

/** Mirrors the real Tabs.Screen registration in app/(customer)/_layout.tsx
 * -- including the three href:null detail routes, which real
 * navigation.state.routes still contains (see CustomerGlassTabBar.tsx's own
 * comment on why route filtering can't rely on that being pre-filtered). */
const ROUTE_NAMES = [
  'explore',
  'search',
  'bookings/index',
  'profile/index',
  'listing/[vehicleId]',
  'checkout/[vehicleId]',
  'bookings/[bookingId]',
];

function buildProps(
  focusedName: string,
  navigate = jest.fn(),
  emit = jest.fn(() => ({ defaultPrevented: false })),
) {
  const routes = ROUTE_NAMES.map((name) => ({ key: `${name}-key`, name }));
  const state = { index: routes.findIndex((r) => r.name === focusedName), routes };
  const descriptors = Object.fromEntries(routes.map((r) => [r.key, { options: {} }]));
  const navigation = { navigate, emit };
  const props: CustomerGlassTabBarProps = {
    state,
    descriptors,
    navigation,
    insets: { bottom: 34 },
  };
  return { props, navigate, emit };
}

async function renderBar(props: CustomerGlassTabBarProps) {
  return render(
    <ThemeProvider>
      <CustomerGlassTabBar {...props} />
    </ThemeProvider>,
  );
}

describe('CustomerGlassTabBar', () => {
  it('renders exactly the three capsule tabs plus the detached Search button, labels intact', async () => {
    const { props } = buildProps('explore');
    await renderBar(props);

    for (const label of ['Explore', 'Bookings', 'Profile']) {
      const el = screen.getByText(label);
      expect(el).toBeTruthy();
      expect(el.props.numberOfLines).toBe(1);
    }
    // Search has no text label inside the detached circle, per spec.
    expect(screen.queryByText('Search')).toBeNull();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });

  it('never renders a tab for a hidden (href: null) detail route', async () => {
    const { props } = buildProps('explore');
    await renderBar(props);

    expect(screen.queryByLabelText('listing/[vehicleId]')).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('marks the focused route selected and everything else unselected', async () => {
    const { props } = buildProps('bookings/index');
    await renderBar(props);

    const bookingsTab = screen.getByLabelText('Bookings');
    expect(bookingsTab.props.accessibilityState).toEqual({ selected: true });

    const exploreTab = screen.getByLabelText('Explore');
    expect(exploreTab.props.accessibilityState).toEqual({ selected: false });
  });

  it('navigating a capsule tab calls navigation.navigate with that route', async () => {
    const { props, navigate } = buildProps('explore');
    await renderBar(props);

    fireEvent.press(screen.getByLabelText('Profile'));

    expect(navigate).toHaveBeenCalledWith('profile/index', undefined);
  });

  it('does not navigate when pressing the already-focused tab', async () => {
    const { props, navigate } = buildProps('explore');
    await renderBar(props);

    fireEvent.press(screen.getByLabelText('Explore'));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when the emitted tabPress event is defaultPrevented', async () => {
    const { props, navigate } = buildProps(
      'explore',
      jest.fn(),
      jest.fn(() => ({ defaultPrevented: true })),
    );
    await renderBar(props);

    fireEvent.press(screen.getByLabelText('Bookings'));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('pressing the detached Search circle navigates to the search route', async () => {
    const { props, navigate } = buildProps('explore');
    await renderBar(props);

    fireEvent.press(screen.getByLabelText('Search'));

    expect(navigate).toHaveBeenCalledWith('search', undefined);
  });
});
