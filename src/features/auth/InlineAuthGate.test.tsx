import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { InlineAuthGate } from './InlineAuthGate';

const mockSignInWithPassword = jest.fn();
const mockSignUpWithPassword = jest.fn();
jest.mock('./session', () => ({
  signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
  signUpWithPassword: (...args: unknown[]) => mockSignUpWithPassword(...args),
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

  it('signs in with the entered email and password', async () => {
    mockSignInWithPassword.mockResolvedValue({ ok: true, data: null });
    await renderGate();

    await fireEvent.changeText(screen.getByTestId('inline-auth-email'), 'rider@example.com');
    await fireEvent.changeText(screen.getByTestId('inline-auth-password'), 'hunter22');
    await fireEvent.press(screen.getByTestId('inline-auth-submit'));

    expect(mockSignInWithPassword).toHaveBeenCalledWith('rider@example.com', 'hunter22');
  });

  it('shows an error and does not call sign-in when the password is empty', async () => {
    await renderGate();

    await fireEvent.changeText(screen.getByTestId('inline-auth-email'), 'rider@example.com');
    await fireEvent.press(screen.getByTestId('inline-auth-submit'));

    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(await screen.findByTestId('inline-auth-error')).toHaveTextContent('Enter your password.');
  });

  it('surfaces an invalid-credentials error from the server', async () => {
    mockSignInWithPassword.mockResolvedValue({ ok: false, error: { message: 'Invalid login credentials' } });
    await renderGate();

    await fireEvent.changeText(screen.getByTestId('inline-auth-email'), 'rider@example.com');
    await fireEvent.changeText(screen.getByTestId('inline-auth-password'), 'wrong-password');
    await fireEvent.press(screen.getByTestId('inline-auth-submit'));

    expect(await screen.findByTestId('inline-auth-error')).toHaveTextContent('Invalid login credentials');
  });

  it('switches to create-account mode and requires a matching confirmation password', async () => {
    await renderGate();

    await fireEvent.press(screen.getByTestId('inline-auth-toggle-mode'));
    expect(await screen.findByTestId('inline-auth-confirm-password')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('inline-auth-email'), 'rider@example.com');
    await fireEvent.changeText(screen.getByTestId('inline-auth-password'), 'hunter22');
    await fireEvent.changeText(screen.getByTestId('inline-auth-confirm-password'), 'different');
    await fireEvent.press(screen.getByTestId('inline-auth-submit'));

    expect(mockSignUpWithPassword).not.toHaveBeenCalled();
    expect(await screen.findByTestId('inline-auth-error')).toHaveTextContent('Passwords do not match.');
  });

  it('creates the account and prompts for email confirmation when required', async () => {
    mockSignUpWithPassword.mockResolvedValue({ ok: true, data: { needsEmailConfirmation: true } });
    await renderGate();

    await fireEvent.press(screen.getByTestId('inline-auth-toggle-mode'));
    await fireEvent.changeText(screen.getByTestId('inline-auth-email'), 'rider@example.com');
    await fireEvent.changeText(screen.getByTestId('inline-auth-password'), 'hunter22');
    await fireEvent.changeText(screen.getByTestId('inline-auth-confirm-password'), 'hunter22');
    await fireEvent.press(screen.getByTestId('inline-auth-submit'));

    expect(mockSignUpWithPassword).toHaveBeenCalledWith('rider@example.com', 'hunter22');
    expect(await screen.findByTestId('inline-auth-info')).toHaveTextContent(
      'Account created — check your email to confirm it, then sign in below.',
    );
    // Back on the sign-in step, ready to sign in once confirmed.
    expect(screen.queryByTestId('inline-auth-confirm-password')).toBeNull();
  });
});
