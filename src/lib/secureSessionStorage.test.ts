import { secureSessionStorage } from './secureSessionStorage';

// jest-expo's built-in mocks for these native modules are stateless
// (every call resolves undefined), so this test's own in-memory Maps
// replace them for a real, deterministic round trip -- same reasoning as
// uploads.test.ts mocking expo-image-manipulator directly.
const mockAsyncStorageMap = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(mockAsyncStorageMap.get(key) ?? null),
    setItem: (key: string, value: string) => {
      mockAsyncStorageMap.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      mockAsyncStorageMap.delete(key);
      return Promise.resolve();
    },
  },
}));

const mockSecureStoreMap = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => Promise.resolve(mockSecureStoreMap.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    mockSecureStoreMap.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    mockSecureStoreMap.delete(key);
    return Promise.resolve();
  },
}));

// Deterministic "random" bytes are fine here -- this test exercises the
// encrypt/decrypt round trip and error handling, not randomness itself.
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: (byteCount: number) =>
    Promise.resolve(Uint8Array.from({ length: byteCount }, (_, i) => (i * 7 + 3) % 256)),
}));

afterEach(() => {
  mockAsyncStorageMap.clear();
  mockSecureStoreMap.clear();
});

describe('secureSessionStorage', () => {
  it('round-trips a value through setItem/getItem', async () => {
    await secureSessionStorage.setItem('sb-project-auth-token', '{"access_token":"secret-jwt"}');

    expect(await secureSessionStorage.getItem('sb-project-auth-token')).toBe('{"access_token":"secret-jwt"}');
  });

  it('never stores the plaintext value in AsyncStorage', async () => {
    await secureSessionStorage.setItem('sb-project-auth-token', '{"access_token":"secret-jwt"}');

    const stored = mockAsyncStorageMap.get('sb-project-auth-token');
    expect(stored).toBeDefined();
    expect(stored).not.toContain('secret-jwt');
  });

  it('keeps the encryption key in SecureStore, not AsyncStorage', async () => {
    await secureSessionStorage.setItem('sb-project-auth-token', 'value');

    expect(mockSecureStoreMap.get('sb-project-auth-token-encryption-key')).toBeDefined();
    expect(mockAsyncStorageMap.has('sb-project-auth-token-encryption-key')).toBe(false);
  });

  it('returns null for a key that was never set', async () => {
    expect(await secureSessionStorage.getItem('never-set')).toBeNull();
  });

  it('returns null and clears the blob when the encryption key is missing', async () => {
    // Simulates a keychain wipe (app data cleared, reinstall) leaving a
    // stale encrypted blob with no key able to decrypt it.
    mockAsyncStorageMap.set('orphaned', 'deadbeef');

    expect(await secureSessionStorage.getItem('orphaned')).toBeNull();
    expect(mockAsyncStorageMap.has('orphaned')).toBe(false);
  });

  it('returns null and clears the blob when it is corrupted', async () => {
    await secureSessionStorage.setItem('corrupt-me', 'value');
    mockAsyncStorageMap.set('corrupt-me', 'not-valid-hex-zz');

    expect(await secureSessionStorage.getItem('corrupt-me')).toBeNull();
    expect(mockAsyncStorageMap.has('corrupt-me')).toBe(false);
  });

  it('removeItem clears both the blob and its encryption key', async () => {
    await secureSessionStorage.setItem('sb-project-auth-token', 'value');

    await secureSessionStorage.removeItem('sb-project-auth-token');

    expect(mockAsyncStorageMap.has('sb-project-auth-token')).toBe(false);
    expect(mockSecureStoreMap.has('sb-project-auth-token-encryption-key')).toBe(false);
  });

  it('reuses the same encryption key across multiple writes to the same storage key', async () => {
    await secureSessionStorage.setItem('sb-project-auth-token', 'first');
    const keyAfterFirst = mockSecureStoreMap.get('sb-project-auth-token-encryption-key');

    await secureSessionStorage.setItem('sb-project-auth-token', 'second');
    const keyAfterSecond = mockSecureStoreMap.get('sb-project-auth-token-encryption-key');

    expect(keyAfterSecond).toBe(keyAfterFirst);
    expect(await secureSessionStorage.getItem('sb-project-auth-token')).toBe('second');
  });
});
