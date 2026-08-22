import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { getSupabase } from './supabase';

// Shared by vehicle photos (src/features/fleet/photos.ts) and inspection
// photos (src/features/inspections) -- both upload user-picked images to a
// private Supabase Storage bucket and both need the same three things:
// permission handling, client-side compression before the upload leaves
// the device, and a retry that's actually safe to repeat.

export type ImagePermissionSource = 'library' | 'camera';

/** Centralizes the permission-request call so every picker entry point
 * asks the same way and gets the same {granted} shape back, regardless of
 * which underlying expo-image-picker method that source needs. */
export async function requestImagePermission(source: ImagePermissionSource): Promise<{ granted: boolean }> {
  const result =
    source === 'library'
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();
  return { granted: result.granted };
}

const MAX_DIMENSION = 1600;
const COMPRESS_QUALITY = 0.6;

export interface CompressedImage {
  uri: string;
  contentType: string;
}

/**
 * Downscales to at most MAX_DIMENSION on the long edge (never upscales a
 * smaller original) and re-encodes as JPEG at COMPRESS_QUALITY -- vehicle
 * and inspection photos are viewed at a few hundred px in-app, not
 * archived at camera resolution, and a rental company running this on
 * Maldivian mobile data benefits from every KB shaved off.
 *
 * Uses the new contextual `ImageManipulator.manipulate().resize().
 * renderAsync()` chain, not the deprecated `manipulateAsync()` function
 * (SDK 57 -- see AGENTS.md on checking current docs before writing Expo
 * code).
 */
export async function compressImage(
  uri: string,
  originalWidth: number,
  originalHeight: number,
): Promise<CompressedImage> {
  const longEdge = Math.max(originalWidth, originalHeight);
  const scale = longEdge > MAX_DIMENSION ? MAX_DIMENSION / longEdge : 1;

  const context = ImageManipulator.manipulate(uri);
  if (scale < 1) {
    context.resize({ width: Math.round(originalWidth * scale), height: Math.round(originalHeight * scale) });
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: COMPRESS_QUALITY, format: SaveFormat.JPEG });
  return { uri: result.uri, contentType: 'image/jpeg' };
}

interface StorageErrorShape {
  statusCode?: string;
  message?: string;
}

/**
 * A permission/validation rejection (RLS denial, bad bucket, 4xx other
 * than a genuinely transient one) will fail exactly the same way on every
 * retry -- retrying just delays telling the user and burns their data
 * plan. Anything else (no status code at all, which is what a dropped
 * connection or DNS failure looks like from supabase-js; 408/429/5xx) is
 * worth another attempt.
 */
function isRetryableStorageError(error: StorageErrorShape | null): boolean {
  if (!error) return false;
  const status = error.statusCode ? Number(error.statusCode) : undefined;
  if (status === undefined) return true;
  if (status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface UploadWithRetryInput {
  bucket: string;
  path: string;
  blob: Blob;
  contentType: string;
  maxAttempts?: number;
  /** Called before each attempt, 1-indexed -- lets a caller show "Retrying (2/3)…" */
  onAttempt?: (attempt: number, maxAttempts: number) => void;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

/**
 * Retries a Supabase Storage upload with exponential backoff, but only for
 * errors that look transient (see isRetryableStorageError) -- a
 * permission denial fails fast instead of retrying uselessly. Attempts
 * after the first use upsert: a first attempt that actually wrote the
 * object but lost the response on the way back would otherwise fail a
 * safe retry with "already exists".
 */
export async function uploadWithRetry({
  bucket,
  path,
  blob,
  contentType,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  onAttempt,
}: UploadWithRetryInput): Promise<void> {
  let lastError: StorageErrorShape | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    onAttempt?.(attempt, maxAttempts);
    const { error } = await getSupabase()
      .storage.from(bucket)
      .upload(path, blob, { contentType, upsert: attempt > 1 });
    if (!error) return;

    lastError = error;
    if (!isRetryableStorageError(error) || attempt === maxAttempts) {
      throw error;
    }
    await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
  }
  throw lastError;
}
