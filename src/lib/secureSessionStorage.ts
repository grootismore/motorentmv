import AsyncStorage from '@react-native-async-storage/async-storage';
import aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * A Supabase auth `storage` adapter that keeps the session blob encrypted
 * at rest -- plain AsyncStorage on its own is not secure enough for auth
 * tokens (see the TODO this replaced in supabase.ts). SecureStore alone
 * can't hold the session directly either: iOS Keychain items are capped
 * around 2KB, and a Supabase session (access + refresh JWT, user record)
 * routinely exceeds that.
 *
 * The standard pattern for this (matching Supabase's own Expo guidance):
 * generate a random AES-256 key per storage key, keep *that* small key in
 * SecureStore, and store the actual session -- encrypted with it -- in
 * AsyncStorage, which has no such size limit. AES-CTR with a fresh random
 * IV per write (prepended to the ciphertext) rather than a fixed
 * counter -- reusing a counter across different plaintexts under the same
 * key breaks CTR mode's security.
 */

const KEY_BYTES = 32; // AES-256
const IV_BYTES = 16;

function encryptionKeyName(storageKey: string): string {
  return `${storageKey}-encryption-key`;
}

async function getOrCreateEncryptionKey(storageKey: string): Promise<Uint8Array> {
  const keyName = encryptionKeyName(storageKey);
  const existingHex = await SecureStore.getItemAsync(keyName);
  if (existingHex) {
    return aesjs.utils.hex.toBytes(existingHex);
  }
  const key = await Crypto.getRandomBytesAsync(KEY_BYTES);
  await SecureStore.setItemAsync(keyName, aesjs.utils.hex.fromBytes(key));
  return key;
}

function encrypt(key: Uint8Array, iv: Uint8Array, plaintext: string): string {
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(plaintext));
  return aesjs.utils.hex.fromBytes(iv) + aesjs.utils.hex.fromBytes(encryptedBytes);
}

function decrypt(key: Uint8Array, payload: string): string {
  const iv = aesjs.utils.hex.toBytes(payload.slice(0, IV_BYTES * 2));
  const cipherBytes = aesjs.utils.hex.toBytes(payload.slice(IV_BYTES * 2));
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(cipherBytes));
}

export const secureSessionStorage = {
  async getItem(storageKey: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(storageKey);
    if (!encrypted) return null;

    const encryptionKeyHex = await SecureStore.getItemAsync(encryptionKeyName(storageKey));
    if (!encryptionKeyHex) {
      // The encryption key is gone (keychain cleared, fresh install over
      // stale AsyncStorage, etc) -- the blob is permanently unreadable
      // without it. Drop it and report "no session" rather than throwing;
      // the user just signs in again, same as any other expired session.
      await AsyncStorage.removeItem(storageKey);
      return null;
    }

    try {
      return decrypt(aesjs.utils.hex.toBytes(encryptionKeyHex), encrypted);
    } catch {
      await AsyncStorage.removeItem(storageKey);
      return null;
    }
  },

  async setItem(storageKey: string, value: string): Promise<void> {
    const key = await getOrCreateEncryptionKey(storageKey);
    const iv = await Crypto.getRandomBytesAsync(IV_BYTES);
    await AsyncStorage.setItem(storageKey, encrypt(key, iv, value));
  },

  async removeItem(storageKey: string): Promise<void> {
    await AsyncStorage.removeItem(storageKey);
    await SecureStore.deleteItemAsync(encryptionKeyName(storageKey));
  },
};
