/**
 * Shared result shape for the typed API boundary. Every data-fetching
 * function in `src/lib` and `src/features/*` should resolve to a `Result`
 * instead of throwing, so screens can render loading/empty/error states
 * without try/catch scattered through the UI layer.
 */
export type Result<T, E = ApiError> = { ok: true; data: T } | { ok: false; error: E };

export interface ApiError {
  message: string;
  code?: string;
  cause?: unknown;
}

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E = ApiError>(error: E): Result<never, E> {
  return { ok: false, error };
}
