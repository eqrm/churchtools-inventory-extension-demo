import type { Asset } from '../types/entities';

/**
 * Find an asset by scanning a barcode or asset number.
 * Precedence:
 * 1. Exact barcode match (case-insensitive)
 * 2. Exact asset number match (case-insensitive)
 */
export function findAssetByScanValue<T extends { barcode?: string; assetNumber?: string }>(
  assets: T[],
  scanValue: string
): T | undefined {
  const normalized = scanValue.trim().toLowerCase();
  if (!normalized) return undefined;

  // 1. Exact barcode match
  const barcodeMatch = assets.find(a => a.barcode?.trim().toLowerCase() === normalized);
  if (barcodeMatch) return barcodeMatch;

  // 2. Exact asset number match
  const numberMatch = assets.find(a => a.assetNumber?.trim().toLowerCase() === normalized);
  if (numberMatch) return numberMatch;

  return undefined;
}
