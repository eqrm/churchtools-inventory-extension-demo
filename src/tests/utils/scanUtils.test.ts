import { describe, it, expect } from 'vitest';
import { findAssetByScanValue } from '../../utils/scanUtils';
import type { Asset } from '../../types/entities';

const mockAssets: Asset[] = [
  {
    id: '1',
    assetNumber: 'A-001',
    barcode: 'BAR-001',
    name: 'Asset 1',
    status: 'available',
    assetType: { id: 't1', name: 'Type 1' },
    isParent: false,
    bookable: true,
    customFieldValues: {},
    createdBy: 'user',
    createdByName: 'User',
    createdAt: '2024-01-01',
    lastModifiedBy: 'user',
    lastModifiedByName: 'User',
    lastModifiedAt: '2024-01-01',
    qrCode: 'QR-001',
  },
  {
    id: '2',
    assetNumber: 'A-002',
    barcode: 'BAR-002',
    name: 'Asset 2',
    status: 'available',
    assetType: { id: 't1', name: 'Type 1' },
    isParent: false,
    bookable: true,
    customFieldValues: {},
    createdBy: 'user',
    createdByName: 'User',
    createdAt: '2024-01-01',
    lastModifiedBy: 'user',
    lastModifiedByName: 'User',
    lastModifiedAt: '2024-01-01',
    qrCode: 'QR-002',
  },
];

describe('findAssetByScanValue', () => {
  it('finds asset by exact barcode', () => {
    const result = findAssetByScanValue(mockAssets, 'BAR-001');
    expect(result).toBeDefined();
    expect(result?.id).toBe('1');
  });

  it('finds asset by exact barcode (case insensitive)', () => {
    const result = findAssetByScanValue(mockAssets, 'bar-002');
    expect(result).toBeDefined();
    expect(result?.id).toBe('2');
  });

  it('finds asset by exact asset number', () => {
    const result = findAssetByScanValue(mockAssets, 'A-001');
    expect(result).toBeDefined();
    expect(result?.id).toBe('1');
  });

  it('finds asset by exact asset number (case insensitive)', () => {
    const result = findAssetByScanValue(mockAssets, 'a-002');
    expect(result).toBeDefined();
    expect(result?.id).toBe('2');
  });

  it('prioritizes barcode over asset number', () => {
    // Create a conflict where one asset's barcode matches another's asset number (unlikely but possible)
    const conflictAssets: Asset[] = [
      ...mockAssets,
      {
        ...mockAssets[0],
        id: '3',
        assetNumber: 'BAR-001', // Same as asset 1 barcode
        barcode: 'UNIQUE-3',
      },
    ];

    const result = findAssetByScanValue(conflictAssets, 'BAR-001');
    expect(result).toBeDefined();
    expect(result?.id).toBe('1'); // Should match asset 1 by barcode, not asset 3 by number
  });

  it('returns undefined if no match found', () => {
    const result = findAssetByScanValue(mockAssets, 'NON-EXISTENT');
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty input', () => {
    const result = findAssetByScanValue(mockAssets, '   ');
    expect(result).toBeUndefined();
  });
});
