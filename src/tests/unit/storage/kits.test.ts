import { describe, expect, it, vi } from 'vitest';
import { createKit, type KitDependencies } from '../../../services/storage/churchToolsProvider/kits';
import type { Asset, AssetType, KitCreate } from '../../../types/entities';
import type { ChurchToolsAPIClient } from '../../../services/api/ChurchToolsAPIClient';

const mockApiClient = {
  getDataValues: vi.fn(),
  createDataValue: vi.fn(),
  updateDataValue: vi.fn(),
  deleteDataValue: vi.fn(),
  createDataCategory: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', name: 'User One' }),
} as unknown as ChurchToolsAPIClient;

const mockDeps: KitDependencies = {
  moduleId: '123',
  apiClient: mockApiClient,
  getAllCategoriesIncludingHistory: vi.fn().mockResolvedValue([
    { id: 'cat-1', name: '__kits__' } as AssetType,
  ]),
  mapToAssetType: vi.fn(),
  recordChange: vi.fn(),
  getAsset: vi.fn(),
  getAssets: vi.fn(),
  isAssetAvailable: vi.fn(),
  getBookings: vi.fn(),
};

describe('kits storage service', () => {
  it('allows creating a kit with a broken asset', async () => {
    const brokenAsset = {
      id: 'asset-1',
      name: 'Broken Mic',
      assetNumber: 'A001',
      status: 'broken',
      assetType: { id: 'type-1', name: 'Microphone' },
      customFieldValues: {},
    } as unknown as Asset;

    vi.mocked(mockDeps.getAsset).mockResolvedValue(brokenAsset);
    vi.mocked(mockApiClient.createDataValue).mockResolvedValue({
      id: 'kit-1',
      value: JSON.stringify({
        name: 'My Kit',
        type: 'fixed',
        boundAssets: [{ assetId: 'asset-1', assetNumber: 'A001' }],
      }),
    });

    const kitData: KitCreate = {
      name: 'My Kit',
      type: 'fixed',
      boundAssets: [{ assetId: 'asset-1', assetNumber: 'A001', name: 'Broken Mic' }],
      poolRequirements: [],
    };

    const result = await createKit(mockDeps, kitData);

    expect(result).toBeDefined();
    expect(mockApiClient.createDataValue).toHaveBeenCalled();
  });

  it('throws error when creating a kit with a deleted asset', async () => {
    const deletedAsset = {
      id: 'asset-2',
      name: 'Deleted Mic',
      assetNumber: 'A002',
      status: 'deleted',
      assetType: { id: 'type-1', name: 'Microphone' },
      customFieldValues: {},
    } as unknown as Asset;

    vi.mocked(mockDeps.getAsset).mockResolvedValue(deletedAsset);

    const kitData: KitCreate = {
      name: 'My Kit',
      type: 'fixed',
      boundAssets: [{ assetId: 'asset-2', assetNumber: 'A002', name: 'Deleted Mic' }],
      poolRequirements: [],
    };

    await expect(createKit(mockDeps, kitData)).rejects.toThrow('has been deleted');
  });
});
