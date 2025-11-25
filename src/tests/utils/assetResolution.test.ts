import { describe, expect, it, vi } from 'vitest';
import { resolveAssetById } from '../../utils/assetResolution';
import type { Asset, Kit } from '../../types/entities';

function buildAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    assetNumber: 'AUD-001',
    name: 'Main Mixer',
    assetType: { id: 'type-a', name: 'Audio' },
    status: 'available',
    bookable: true,
    isParent: false,
    barcode: 'AUD-001',
    qrCode: 'AUD-001',
    customFieldValues: {},
    createdBy: 'user-1',
    createdByName: 'Test User',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastModifiedBy: 'user-1',
    lastModifiedByName: 'Test User',
    lastModifiedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildKit(overrides: Partial<Kit> = {}): Kit {
  return {
    id: 'kit-1234',
    name: 'Camera Kit',
    type: 'fixed',
    status: 'available',
    tags: [],
    inheritedProperties: [],
    boundAssets: [
      { assetId: 'asset-1', assetNumber: 'CAM-001', name: 'Camera Body' },
    ],
    poolRequirements: [],
    createdBy: 'user-1',
    createdByName: 'Test User',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastModifiedBy: 'user-1',
    lastModifiedByName: 'Test User',
    lastModifiedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('resolveAssetById', () => {
  it('returns a regular asset via storage provider when id is not a kit', async () => {
    const asset = buildAsset();
    const storageProvider = { getAsset: vi.fn().mockResolvedValue(asset) };

    const result = await resolveAssetById(asset.id, {
      storageProvider,
      kitService: null,
    });

    expect(storageProvider.getAsset).toHaveBeenCalledWith(asset.id);
    expect(result).toEqual(asset);
  });

  it('maps a kit id to a pseudo asset via kit service', async () => {
    const kit = buildKit({ id: 'demo-kit' });
    const kitService = { getKit: vi.fn().mockResolvedValue(kit) };

    const result = await resolveAssetById('kit-demo-kit', {
      storageProvider: null,
      kitService,
    });

    expect(kitService.getKit).toHaveBeenCalledWith('demo-kit');
    expect(result.isKit).toBe(true);
    expect(result.kitId).toBe('demo-kit');
  });

  it('throws when kit id cannot be resolved', async () => {
    const kitService = { getKit: vi.fn().mockResolvedValue(null) };

    await expect(
      resolveAssetById('kit-missing', {
        storageProvider: null,
        kitService,
      }),
    ).rejects.toThrow('Kit missing not found');
  });
});
