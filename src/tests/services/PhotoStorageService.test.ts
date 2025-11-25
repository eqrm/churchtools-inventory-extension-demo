import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhotoStorageService } from '@/services/PhotoStorageService';

const compressionMocks = vi.hoisted(() => ({
  compressImageToDataUrl: vi.fn<
    (file: File, options: { maxWidth: number; maxHeight: number; quality: number }) => Promise<string>
  >(),
}));

vi.mock('@/utils/imageCompression', () => compressionMocks);

const { compressImageToDataUrl } = compressionMocks;

describe('PhotoStorageService (base64 mode)', () => {
  beforeEach(() => {
    compressImageToDataUrl.mockReset();
  });

  it('compressImage uses 800x600 @0.8 quality by default', async () => {
    const service = new PhotoStorageService();
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' });
    compressImageToDataUrl.mockResolvedValue('data:image/jpeg;base64,mock');

    const result = await service.compressImage(file);

    expect(result).toBe('data:image/jpeg;base64,mock');
    expect(compressImageToDataUrl).toHaveBeenCalledTimes(1);
    expect(compressImageToDataUrl).toHaveBeenCalledWith(file, {
      maxWidth: 800,
      maxHeight: 600,
      quality: 0.8,
    });
  });

  it('rejects files larger than 2MB when storing', async () => {
    const service = new PhotoStorageService();
    const bigBuffer = new Uint8Array(2 * 1024 * 1024 + 1);
    const file = new File([bigBuffer], 'big.jpg', { type: 'image/jpeg' });
    compressImageToDataUrl.mockResolvedValue('data:image/jpeg;base64,too-big');

    await expect(service.storePhotos([file])).rejects.toThrow(/2MB/);
    expect(compressImageToDataUrl).not.toHaveBeenCalled();
  });

  it('rejects more than 3 files', async () => {
    const service = new PhotoStorageService();
    const files = Array.from({ length: 4 }, (_, index) =>
      new File([new Uint8Array([index])], `photo-${index}.jpg`, { type: 'image/jpeg' })
    );
    compressImageToDataUrl.mockResolvedValue('data:image/jpeg;base64,noop');

    await expect(service.storePhotos(files)).rejects.toThrow(/Maximum of 3 photos/);
    expect(compressImageToDataUrl).not.toHaveBeenCalled();
  });

  it('stores and retrieves photos in base64 mode', async () => {
    const service = new PhotoStorageService();
    const files = [
      new File([new Uint8Array([1])], 'first.jpg', { type: 'image/jpeg' }),
      new File([new Uint8Array([2])], 'second.jpg', { type: 'image/jpeg' }),
    ];
    compressImageToDataUrl
      .mockResolvedValueOnce('data:image/jpeg;base64,first')
      .mockResolvedValueOnce('data:image/jpeg;base64,second');

    const handles = await service.storePhotos(files);

    expect(handles).toEqual([
      'data:image/jpeg;base64,first',
      'data:image/jpeg;base64,second',
    ]);
    expect(compressImageToDataUrl).toHaveBeenCalledTimes(2);

    const retrieved = await service.retrievePhoto(handles[0]);
    expect(retrieved).toBe('data:image/jpeg;base64,first');
  });
});

describe('PhotoStorageService (files API mode)', () => {
  beforeEach(() => {
    compressImageToDataUrl.mockReset();
  });

  it('switches to Files API when feature flag enabled', async () => {
    const upload = vi.fn<(file: File) => Promise<string>>(async (file: File) => `file://${file.name}`);
    const get = vi.fn<(handle: string) => Promise<string>>(async (handle: string) =>
      `https://files.example.com/${handle}`,
    );
    const remove = vi.fn<(handle: string) => Promise<void>>(async () => undefined);

    const service = new PhotoStorageService({
      mode: 'files-api',
      filesApiClient: {
        upload,
        get,
        delete: remove,
      },
    });

    const files = [new File([new Uint8Array([1])], 'first.jpg', { type: 'image/jpeg' })];

    const handles = await service.storePhotos(files);

    expect(handles).toEqual(['file://first.jpg']);
  expect(upload).toHaveBeenCalledTimes(1);
    expect(compressImageToDataUrl).not.toHaveBeenCalled();

    await service.retrievePhoto(handles[0]);
    expect(get).toHaveBeenCalledWith('file://first.jpg');
  });
});
