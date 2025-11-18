import { describe, expect, it } from 'vitest';
import type { Asset } from '../../../src/types/entities';
import { combineAssetsWithKitAssets } from '../../../src/hooks/useAssets';

const TIMESTAMP = '2025-11-17T00:00:00.000Z';

function createAsset(overrides?: Partial<Asset>): Asset {
  return {
    id: overrides?.id ?? 'asset-1',
    assetNumber: overrides?.assetNumber ?? 'ASSET-1',
    name: overrides?.name ?? 'Sample Asset',
    assetType: overrides?.assetType ?? { id: 'type-1', name: 'General' },
    status: overrides?.status ?? 'available',
    bookable: overrides?.bookable ?? true,
    isParent: overrides?.isParent ?? false,
    barcode: overrides?.barcode ?? 'ASSET-1',
    qrCode: overrides?.qrCode ?? 'ASSET-1',
    customFieldValues: overrides?.customFieldValues ?? {},
    createdBy: overrides?.createdBy ?? 'user-1',
    createdByName: overrides?.createdByName ?? 'Example User',
    createdAt: overrides?.createdAt ?? TIMESTAMP,
    lastModifiedBy: overrides?.lastModifiedBy ?? 'user-1',
    lastModifiedByName: overrides?.lastModifiedByName ?? 'Example User',
    lastModifiedAt: overrides?.lastModifiedAt ?? TIMESTAMP,
    ...overrides,
  } as Asset;
}

describe('combineAssetsWithKitAssets', () => {
  it('returns assets unchanged when there are no kits', () => {
    const baseAsset = createAsset({ id: 'asset-1' });
    expect(combineAssetsWithKitAssets([baseAsset], [])).toEqual([baseAsset]);
  });

  it('returns only kit assets when base assets are missing', () => {
    const kitAsset = createAsset({ id: 'kit-1', assetNumber: 'KIT-001', isKit: true });
    expect(combineAssetsWithKitAssets(undefined, [kitAsset])).toEqual([kitAsset]);
  });

  it('appends kit assets after the base assets', () => {
    const baseAsset = createAsset({ id: 'asset-1' });
    const kitAsset = createAsset({ id: 'kit-1', assetNumber: 'KIT-002', isKit: true });
    expect(combineAssetsWithKitAssets([baseAsset], [kitAsset])).toEqual([baseAsset, kitAsset]);
  });
});
