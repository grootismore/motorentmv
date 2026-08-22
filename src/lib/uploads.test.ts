import { compressImage, uploadWithRetry } from './uploads';

// jest.mock calls (and their referenced `mock*`-prefixed variables) are
// hoisted above the import above by babel-plugin-jest-hoist regardless of
// source position -- neither uploads.ts nor these mocked modules run
// anything at import time, only when the test bodies below actually call
// compressImage/uploadWithRetry, so this ordering (imports first) is safe
// and keeps eslint's import/first rule satisfied.
const mockSaveAsync = jest.fn();
const mockRenderAsync = jest.fn(() => Promise.resolve({ saveAsync: mockSaveAsync }));
const mockResize = jest.fn();
const mockManipulate = jest.fn((..._args: unknown[]) => ({
  resize: mockResize,
  renderAsync: mockRenderAsync,
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (...args: unknown[]) => mockManipulate(...args) },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));

const mockUpload = jest.fn();
jest.mock('./supabase', () => ({
  getSupabase: () => ({ storage: { from: () => ({ upload: (...args: unknown[]) => mockUpload(...args) }) } }),
}));

describe('compressImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveAsync.mockResolvedValue({ uri: 'file://compressed.jpg', width: 100, height: 100 });
  });

  it('downscales an image whose long edge exceeds the cap, preserving aspect ratio', async () => {
    const result = await compressImage('file://original.jpg', 3200, 1600);

    expect(mockManipulate).toHaveBeenCalledWith('file://original.jpg');
    expect(mockResize).toHaveBeenCalledWith({ width: 1600, height: 800 });
    expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.6, format: 'jpeg' });
    expect(result).toEqual({ uri: 'file://compressed.jpg', contentType: 'image/jpeg' });
  });

  it('does not upscale or resize an image already under the cap', async () => {
    await compressImage('file://small.jpg', 800, 600);

    expect(mockResize).not.toHaveBeenCalled();
    expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.6, format: 'jpeg' });
  });
});

describe('uploadWithRetry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('succeeds on the first attempt without retrying', async () => {
    mockUpload.mockResolvedValue({ error: null });

    await uploadWithRetry({ bucket: 'b', path: 'p', blob: {} as Blob, contentType: 'image/jpeg' });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledWith('p', {}, { contentType: 'image/jpeg', upsert: false });
  });

  it('retries a network-level failure (no status code) and upserts on the retry', async () => {
    mockUpload
      .mockResolvedValueOnce({ error: { message: 'network request failed' } })
      .mockResolvedValueOnce({ error: null });

    await uploadWithRetry({
      bucket: 'b',
      path: 'p',
      blob: {} as Blob,
      contentType: 'image/jpeg',
      maxAttempts: 3,
    });

    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockUpload).toHaveBeenNthCalledWith(2, 'p', {}, { contentType: 'image/jpeg', upsert: true });
  });

  it('does not retry a permission-style rejection (4xx other than 408/429)', async () => {
    mockUpload.mockResolvedValue({ error: { statusCode: '403', message: 'permission denied' } });

    await expect(
      uploadWithRetry({
        bucket: 'b',
        path: 'p',
        blob: {} as Blob,
        contentType: 'image/jpeg',
        maxAttempts: 3,
      }),
    ).rejects.toEqual({ statusCode: '403', message: 'permission denied' });

    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it('gives up and throws the last error once maxAttempts is exhausted', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'network request failed' } });

    await expect(
      uploadWithRetry({
        bucket: 'b',
        path: 'p',
        blob: {} as Blob,
        contentType: 'image/jpeg',
        maxAttempts: 2,
      }),
    ).rejects.toEqual({ message: 'network request failed' });

    expect(mockUpload).toHaveBeenCalledTimes(2);
  });
});
