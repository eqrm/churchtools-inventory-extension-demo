/**
 * Image Compression Utilities
 * Feature: Phase 13 - Asset Images and Visual Identification
 * Purpose: Wrapper around browser-image-compression library for consistent image processing
 */

import imageCompression from 'browser-image-compression';
import type { CompressionOptions } from '../types/photo';

/**
 * Compress an image file for full-size display
 * @param file - Original image file
 * @param options - Compression options (optional)
 * @returns Compressed file suitable for full-size display
 */
export async function compressImageForDisplay(
  file: File,
  options?: Partial<CompressionOptions>
): Promise<File> {
  const defaultOptions: CompressionOptions = {
    quality: 0.85,
    maxWidth: 2048,
    maxHeight: 2048,
    format: 'image/jpeg',
  };

  const compressionOptions = { ...defaultOptions, ...options };

  return imageCompression(file, {
    ...compressionOptions,
    useWebWorker: true,
  });
}

/**
 * Compress an image file for thumbnail display
 * @param file - Original image file
 * @param options - Compression options (optional)
 * @returns Compressed file suitable for thumbnail display
 */
export async function compressImageForThumbnail(
  file: File,
  options?: Partial<CompressionOptions>
): Promise<File> {
  const defaultOptions: CompressionOptions = {
    quality: 0.7,
    maxWidth: 400,
    maxHeight: 400,
    format: 'image/jpeg',
  };

  const compressionOptions = { ...defaultOptions, ...options };

  return imageCompression(file, {
    ...compressionOptions,
    useWebWorker: true,
  });
}

/**
 * Compress an image file and return a base64 data URL capped by a character limit.
 * Uses iterative compression to ensure the payload stays within storage constraints.
 */
export async function compressImageToDataUrl(
  file: File,
  options?: Partial<CompressionOptions>,
  maxLength = 10_000
): Promise<string> {
  await validateImageFile(file);

  const format = options?.format ?? 'image/jpeg';
  const headerLength = `data:${format};base64,`.length;
  const usableChars = Math.max(256, maxLength - headerLength);
  const targetBytes = Math.max(2048, Math.floor((usableChars * 3) / 4));

  let maxSizeMB = Math.max(0.004, targetBytes / (1024 * 1024));
  let quality = options?.quality ?? 0.75;
  let maxDimension = options?.maxWidth ?? options?.maxHeight ?? 1024;
  maxDimension = Math.min(Math.max(maxDimension, 200), 1200);

  let currentFile = file;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const compressed = await imageCompression(currentFile, {
      maxWidthOrHeight: maxDimension,
      initialQuality: quality,
      maxSizeMB,
      useWebWorker: true,
      fileType: format,
    });

    const dataUrl = await imageCompression.getDataUrlFromFile(compressed);
    if (dataUrl.length <= maxLength) {
      return dataUrl;
    }

    quality = Math.max(0.1, quality - 0.15);
    maxDimension = Math.max(64, Math.floor(maxDimension * 0.7));
    maxSizeMB = Math.max(0.004, maxSizeMB * 0.5);
    currentFile = compressed;
  }

  const lastResort = await imageCompression(currentFile, {
    maxWidthOrHeight: 48,
    initialQuality: 0.08,
    maxSizeMB: 0.004,
    useWebWorker: true,
    fileType: format,
  });
  const lastResortDataUrl = await imageCompression.getDataUrlFromFile(lastResort);
  if (lastResortDataUrl.length <= maxLength) {
    return lastResortDataUrl;
  }

  throw new Error('Unable to compress image within the 10,000 character limit. Please select a smaller image.');
}

/**
 * Validate an image file before compression
 * @param file - File to validate
 * @returns Promise that resolves if valid, rejects with error message if invalid
 */
export async function validateImageFile(file: File): Promise<void> {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Only JPEG, PNG, and WebP are allowed.`);
  }

  // Check file size (max 5MB)
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSizeBytes) {
    throw new Error(`File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum size is 5MB.`);
  }

  // Additional validation: try to load as image to ensure it's valid
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Invalid image file'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get image dimensions without loading the full image
 * @param file - Image file
 * @returns Promise resolving to { width, height }
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}