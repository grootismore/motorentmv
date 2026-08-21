import { requestEmailOtp, signOut, verifyEmailOtp } from './session';

const mockAuth = {
  signInWithOtp: jest.fn(),
  verifyOtp: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({ auth: mockAuth }),
}));

describe('requestEmailOtp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests an OTP and allows sign-up for a new email', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ error: null });
    const result = await requestEmailOtp('rider@example.com');
    expect(result.ok).toBe(true);
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
      email: 'rider@example.com',
      options: { shouldCreateUser: true },
    });
  });

  it('surfaces a Supabase error as a Result', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({
      error: { message: 'Rate limited', code: 'over_request_rate_limit' },
    });
    const result = await requestEmailOtp('rider@example.com');
    expect(result).toEqual({
      ok: false,
      error: { message: 'Rate limited', code: 'over_request_rate_limit' },
    });
  });
});

describe('verifyEmailOtp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('verifies the code against the right email and type', async () => {
    mockAuth.verifyOtp.mockResolvedValue({ error: null });
    const result = await verifyEmailOtp('rider@example.com', '123456');
    expect(result.ok).toBe(true);
    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({
      email: 'rider@example.com',
      token: '123456',
      type: 'email',
    });
  });

  it('surfaces an invalid-code error', async () => {
    mockAuth.verifyOtp.mockResolvedValue({
      error: { message: 'Token has expired or is invalid', code: 'otp_expired' },
    });
    const result = await verifyEmailOtp('rider@example.com', '000000');
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
