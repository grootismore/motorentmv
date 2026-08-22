import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { InlineAuthGate } from './InlineAuthGate';

const mockRequestEmailOtp = jest.fn();
const mockVerifyEmailOtp = jest.fn();
jest.mock('./session', () => ({
  requestEmailOtp: (...args: unknown[]) => mockRequestEmailOtp(...args),
  verifyEmailOtp: (...args: unknown[]) => mockVerifyEmailOtp(...args),
}));

function renderGate() {
  return render(
    <ThemeProvider>
      <InlineAuthGate />
    </ThemeProvider>,
  );
}

describe('InlineAuthGate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests a code for the entered email and advances to the code step', async () => {
    mockRequestEmailOtp.mockResolvedValue({ ok: true, value: null });
    await renderGate();

    await fireEvent.changeText(screen.getByTestId('inline-auth-email'), 'rider@example.com');
    await fireEvent.press(screen.getByTestId('inline-auth-send-code'));

    expect(mockRequestEmailOtp).toHaveBeenCalledWith('rider@example.com');
    expect(await screen.findByTestId('inline-auth-code')).toBeTruthy();
  });

  it('shows an error and stays on the email step when the email is empty', async () => {
    await renderGate();

    await fireEvent.press(screen.getByTestId('inline-auth-send-code'));

    expect(mockRequestEmailOtp).not.toHaveBeenCalled();
    expect(screen.queryByTestId('inline-auth-code')).toBeNull();
  });

  it('surfaces a request error without advancing to the code step', async () => {
    mockRequestEmailOtp.mockResolvedValue({ ok: false, error: { message: 'Rate limited' } });
    await renderGate();

    await fireEvent.changeText(screen.getByTestId('inline-auth-email'), 'rider@example.com');
    await fireEvent.press(screen.getByTestId('inline-auth-send-code'));

    expect(screen.queryByTestId('inline-auth-code')).toBeNull();
  });

  it('verifies the code against the email that requested it', async () => {
    mockRequestEmailOtp.mockResolvedValue({ ok: true, value: null });
    mockVerifyEmailOtp.mockResolvedValue({ ok: true, value: null });
    await renderGate();

    await fireEvent.changeText(screen.getByTestId('inline-auth-email'), 'rider@example.com');
    await fireEvent.press(screen.getByTestId('inline-auth-send-code'));
    await fireEvent.changeText(await screen.findByTestId('inline-auth-code'), '123456');
    await fireEvent.press(screen.getByTestId('inline-auth-confirm'));

    expect(mockVerifyEmailOtp).toHaveBeenCalledWith('rider@example.com', '123456');
  });

  it('lets the user switch back to the email step to correct a typo', async () => {
    mockRequestEmailOtp.mockResolvedValue({ ok: true, value: null });
    await renderGate();

    await fireEvent.changeText(screen.getByTestId('inline-auth-email'), 'rider@example.com');
    await fireEvent.press(screen.getByTestId('inline-auth-send-code'));
    await screen.findByTestId('inline-auth-code');

    await fireEvent.press(screen.getByTestId('inline-auth-change-email'));

    expect(screen.getByTestId('inline-auth-email')).toBeTruthy();
    expect(screen.queryByTestId('inline-auth-code')).toBeNull();
  });
});
