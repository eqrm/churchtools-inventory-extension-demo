/**
 * Photo storage abstraction supporting base64 and ChurchTools Files API modes.
 * Default mode stores compressed base64 strings to align with current backend.
 */

import { compressImageToDataUrl } from '../utils/imageCompression';

export type PhotoStorageMode = 'base64' | 'files-api';

export interface FilesApiClient {
  upload(file: File): Promise<string>;
  get(handle: string): Promise<string>;
  delete(handle: string): Promise<void>;
}

interface CompressionPreset {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

export interface PhotoStorageServiceOptions {
  mode?: PhotoStorageMode;
  maxFiles?: number;
  maxSizeBytes?: number;
  compressionOverrides?: Partial<CompressionPreset>;
  filesApiClient?: FilesApiClient;
}

const DEFAULT_MAX_FILES = 3;
const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const DEFAULT_COMPRESSION: CompressionPreset = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.8,
};

export class PhotoStorageService {
  private readonly mode: PhotoStorageMode;

  private readonly maxFiles: number;

  private readonly maxSizeBytes: number;

  private readonly compression: CompressionPreset;

  private readonly filesApiClient?: FilesApiClient;

  private readonly memoryStorage = new Map<string, string>();

  constructor(options: PhotoStorageServiceOptions = {}) {
    this.mode = options.mode ?? 'base64';
    this.maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
    this.maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
    this.compression = {
      ...DEFAULT_COMPRESSION,
      ...options.compressionOverrides,
    };
    this.filesApiClient = options.filesApiClient;

    if (this.mode === 'files-api' && !this.filesApiClient) {
      throw new Error('filesApiClient must be provided when mode is set to files-api');
    }
  }

  async compressImage(file: File, overrides?: Partial<CompressionPreset>): Promise<string> {
    this.ensureFileSize(file);
    const compression = { ...this.compression, ...overrides } satisfies CompressionPreset;
    const base64 = await compressImageToDataUrl(file, compression);
    this.ensureBase64Size(base64);
    return base64;
  }

  async storePhotos(files: File[]): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    if (files.length > this.maxFiles) {
      throw new Error(`Maximum of ${this.maxFiles} photos allowed.`);
    }

    if (this.mode === 'files-api') {
      const client = this.requireFilesApiClient();
      const handles: string[] = [];
      for (const file of files) {
        this.ensureFileSize(file);
        const handle = await client.upload(file);
        handles.push(handle);
      }
      return handles;
    }

    const handles: string[] = [];
    for (const file of files) {
      this.ensureFileSize(file);
      const base64 = await this.compressImage(file);
      this.memoryStorage.set(base64, base64);
      handles.push(base64);
    }
    return handles;
  }

  async retrievePhoto(handle: string): Promise<string> {
    if (this.mode === 'files-api') {
      return this.requireFilesApiClient().get(handle);
    }

    const cached = this.memoryStorage.get(handle);
    return cached ?? handle;
  }

  async deletePhotos(handles: string[]): Promise<void> {
    if (!handles.length) {
      return;
    }

    if (this.mode === 'files-api') {
      const client = this.requireFilesApiClient();
      await Promise.all(handles.map((handle) => client.delete(handle)));
      return;
    }

    for (const handle of handles) {
      this.memoryStorage.delete(handle);
    }
  }

  private ensureFileSize(file: File): void {
    if (file.size > this.maxSizeBytes) {
      throw new Error(`Photo exceeds maximum size of ${Math.floor(this.maxSizeBytes / (1024 * 1024))}MB.`);
    }
  }

  private ensureBase64Size(base64: string): void {
    const approxBytes = Math.floor((base64.length * 3) / 4);
    if (approxBytes > this.maxSizeBytes) {
      throw new Error('Compressed image exceeds maximum size after processing (2MB limit).');
    }
  }

  private requireFilesApiClient(): FilesApiClient {
    if (!this.filesApiClient) {
      throw new Error('Files API client is not configured for files-api mode.');
    }

    return this.filesApiClient;
  }
}
