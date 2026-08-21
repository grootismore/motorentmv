import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * Persists the Query cache to AsyncStorage so a screen that was already
 * loaded (e.g. today's fleet list) still renders its last-known data after
 * an app restart with no connectivity, not just within the same session
 * (PRD §11 offline behavior). Never persists documents/photos — those stay
 * as short-lived signed URLs fetched fresh, not cached bytes.
 */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'motorentmv-query-cache',
  throttleTime: 1000,
});

/**
 * Opt out a query with `useQuery({ ..., meta: { persist: false } })` — used
 * for anything backed by a short-lived signed URL (photos), which would be
 * stale/broken the moment it's read back from disk.
 */
export function shouldPersistQuery(query: { meta?: Record<string, unknown> | undefined }): boolean {
  return query.meta?.persist !== false;
}
