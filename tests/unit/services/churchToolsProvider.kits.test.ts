import { describe, expect, it, vi } from 'vitest';
import type { Asset, AssetType, KitCreate } from '../../../src/types/entities';
import type { KitDependencies } from '../../../src/services/storage/churchToolsProvider/kits';
import type { ChurchToolsAPIClient } from '../../../src/services/api/ChurchToolsAPIClient';
import { createKit } from '../../../src/services/storage/churchToolsProvider/kits';

const ISO_NOW = '2025-01-01T00:00:00.000Z';

const baseCategory: AssetType = {
  id: 'cat-1',
  name: '__kits__',
  customFields: [],
  createdBy: 'system',
  createdByName: 'System',
  createdAt: ISO_NOW,
  lastModifiedBy: 'system',
  lastModifiedByName: 'System',
  lastModifiedAt: ISO_NOW,
};

const baseAsset: Asset = {
  id: 'asset-1',
  assetNumber: 'EQ-001',
  name: 'Camera body',
  assetType: {
    id: 'type-1',
    name: 'Cameras',
  },
  status: 'available',
  bookable: true,
  barcode: 'barcode-1',
  qrCode: 'qr-1',
  isParent: false,
  customFieldValues: {},
  createdBy: 'system',
  createdByName: 'System',
  createdAt: ISO_NOW,
  lastModifiedBy: 'system',
  lastModifiedByName: 'System',
  lastModifiedAt: ISO_NOW,
};

function buildAsset(overrides?: Partial<Asset>): Asset {
  return {
    ...baseAsset,
    ...overrides,
  };
}

function buildDeps(overrides?: Partial<KitDependencies>): KitDependencies {
  const apiClient = {
    getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', name: 'Inventory Admin' }),
    createDataValue: vi.fn().mockImplementation(async (_moduleId: string, _categoryId: string, payload: { value: string }) => ({
      id: 99,
      value: payload.value,
    })),
    updateDataValue: vi.fn(),
    deleteDataValue: vi.fn(),
    createDataCategory: vi.fn(),
    getDataValues: vi.fn(),
  } as unknown as ChurchToolsAPIClient;

  const deps: KitDependencies = {
    moduleId: 'module-1',
    apiClient,
    getAllCategoriesIncludingHistory: vi.fn().mockResolvedValue([baseCategory]),
    mapToAssetType: (data: unknown) => data as AssetType,
    recordChange: vi.fn().mockResolvedValue(undefined),
    getAsset: vi.fn().mockResolvedValue(buildAsset()),
    getAssets: vi.fn(),
    isAssetAvailable: vi.fn(),
    getBookings: vi.fn(),
  };

  return { ...deps, ...overrides };
}

describe('churchToolsProvider kits', () => {
  const kitInput: KitCreate = {
    name: 'Camera Rig',
    description: 'Main service rig',
    type: 'fixed',
    boundAssets: [
      {
        assetId: 'asset-1',
        assetNumber: 'EQ-001',
        name: 'Camera body',
      },
    ],
    poolRequirements: [],
    location: 'Warehouse',
    status: 'in-use',
    inheritedProperties: ['location', 'status'],
    completenessStatus: 'complete',
  };

  it('allows binding assets that are not available', async () => {
    const getAsset = vi.fn().mockResolvedValue(buildAsset({ status: 'in-use' }));
    const deps = buildDeps({ getAsset });

    await expect(createKit(deps, kitInput)).resolves.toMatchObject({ name: 'Camera Rig' });
    expect(getAsset).toHaveBeenCalledWith('asset-1');
  });

  it('rejects deleted assets when creating a kit', async () => {
    const getAsset = vi.fn().mockResolvedValue(buildAsset({ status: 'deleted' }));
    const deps = buildDeps({ getAsset });

    await expect(createKit(deps, kitInput)).rejects.toThrow(/deleted/);
  });
});
