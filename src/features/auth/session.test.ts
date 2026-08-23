import { signInWithPassword, signOut, signUpWithPassword } from './session';

const mockAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({ auth: mockAuth }),
}));

describe('signUpWithPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates the account and signs in immediately when no email confirmation is required', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    const result = await signUpWithPassword('rider@example.com', 'hunter22');
    expect(result).toEqual({ ok: true, data: { needsEmailConfirmation: false } });
    expect(mockAuth.signUp).toHaveBeenCalledWith({ email: 'rider@example.com', password: 'hunter22' });
  });

  it('reports that email confirmation is required when no session comes back', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const result = await signUpWithPassword('rider@example.com', 'hunter22');
    expect(result).toEqual({ ok: true, data: { needsEmailConfirmation: true } });
  });

  it('surfaces a Supabase error as a Result', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    });
    const result = await signUpWithPassword('rider@example.com', 'hunter22');
    expect(result).toEqual({
      ok: false,
      error: { message: 'User already registered', code: 'user_already_exists' },
    });
  });
});

describe('signInWithPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  it('signs in with the given email and password', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null });
    const result = await signInWithPassword('rider@example.com', 'hunter22');
    expect(result.ok).toBe(true);
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'rider@example.com',
      password: 'hunter22',
    });
  });

  it('surfaces an invalid-credentials error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    });
    const result = await signInWithPassword('rider@example.com', 'wrong-password');
    expect(result.ok).toBe(false);
  });
});

describe('signOut', () => {
  beforeEach(() => jest.clearAllMocks());

  it('signs out successfully', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    const result = await signOut();
    expect(result.ok).toBe(true);
  });
});
