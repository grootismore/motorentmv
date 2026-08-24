import { render } from '@testing-library/react-native';

import { ThemeProvider } from '../../src/design-system/ThemeProvider';
import Index from '../../app/index';

const mockUseAppGate = jest.fn();
jest.mock('../../src/features/auth/useAppGate', () => ({
  useAppGate: () => mockUseAppGate(),
}));

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
}));

describe('Index (root route)', () => {
  afterEach(() => jest.clearAllMocks());

  it('redirects a renter straight to the dashboard, not the removed /today route', async () => {
    mockUseAppGate.mockReturnValue('renter');
    await render(<Index />);
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects a customer to explore', async () => {
    mockUseAppGate.mockReturnValue('customer');
    await render(<Index />);
    expect(mockRedirect).toHaveBeenCalledWith('/explore');
  });

  it('redirects anyone else to role-select', async () => {
    mockUseAppGate.mockReturnValue('auth');
    await render(<Index />);
    expect(mockRedirect).toHaveBeenCalledWith('/role-select');
  });

  it('shows a loading state while the gate is still resolving', async () => {
    mockUseAppGate.mockReturnValue('loading');
    await render(
      <ThemeProvider>
        <Index />
      </ThemeProvider>,
    );
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
