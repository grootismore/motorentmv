import { parseEnv } from './env';

describe('parseEnv', () => {
  it('defaults EXPO_PUBLIC_APP_ENV to development when unset', () => {
    const env = parseEnv({});
    expect(env.EXPO_PUBLIC_APP_ENV).toBe('development');
    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBeUndefined();
  });

  it('accepts a fully configured environment', () => {
    const env = parseEnv({
      EXPO_PUBLIC_APP_ENV: 'preview',
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
    expect(env).toEqual({
      EXPO_PUBLIC_APP_ENV: 'preview',
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
  });

  it('rejects an invalid EXPO_PUBLIC_APP_ENV', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_APP_ENV: 'staging' })).toThrow(/Invalid environment configuration/);
  });

  it('rejects a malformed Supabase URL', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_SUPABASE_URL: 'not-a-url' })).toThrow(
      /Invalid environment configuration/,
    );
  });
});
