import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChurchToolsStorageProvider } from '../ChurchToolsProvider';
import { createMockChurchToolsApi } from './mockChurchToolsApiClient';
import type { Asset } from '../../../types/entities';

const MODULE_ID = '42';

describe('ChurchToolsStorageProvider - Asset Groups', () => {
  let mockApi: ReturnType<typeof createMockChurchToolsApi>;
  let provider: ChurchToolsStorageProvider;

  beforeEach(() => {
    mockApi = createMockChurchToolsApi(MODULE_ID);
    provider = new ChurchToolsStorageProvider(MODULE_ID, mockApi.client);
    mockApi.seedCategory({
      id: 'cat-hidden',
      name: '__ChangeHistory__',
      shorty: 'history',
      description: null,
      data: null,
      customModuleId: Number(MODULE_ID),
    });
    mockApi.seedCategory({
      id: 'cat-audio',
      name: 'Audio',
      shorty: 'audio',
      description: null,
      data: JSON.stringify([]),
      customModuleId: Number(MODULE_ID),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const getAssetGroupCategoryId = async (): Promise<string | undefined> => {
    const categories = await mockApi.client.getDataCategories(MODULE_ID);
    const match = (categories as Array<Record<string, unknown>>).find((category) => category.name === '__AssetGroups__');
    return match ? String(match.id) : undefined;
  };

  it('creates the system asset group category on demand when fetching groups', async () => {
    const before = await getAssetGroupCategoryId();
    expect(before).toBeUndefined();

    const groups = await provider.getAssetGroups();
    expect(groups).toEqual([]);

    const after = await getAssetGroupCategoryId();
    expect(after).toBeDefined();
  });

  it('creates asset groups, assigns members, and records history', async () => {
    const updateAssetSpy = vi
      .spyOn(provider, 'updateAsset')
      .mockResolvedValue({ id: 'asset-1' } as Asset);

    const group = await provider.createAssetGroup({
      name: 'Camera Kit',
      category: { id: 'cat-audio', name: 'Audio' },
      inheritanceRules: {},
      customFieldRules: {},
      memberAssetIds: ['asset-1'],
      manufacturer: 'Canon',
      model: 'C300',
      description: 'Cinema camera kit',
      schemaVersion: '1.0.0',
    });

    expect(group.name).toBe('Camera Kit');
    expect(group.memberAssetIds).toEqual(['asset-1']);

    expect(updateAssetSpy).toHaveBeenCalledWith('asset-1', {
      assetGroup: {
        id: group.id,
        groupNumber: group.groupNumber,
        name: 'Camera Kit',
      },
    });

    const categoryId = await getAssetGroupCategoryId();
    expect(categoryId).toBeDefined();
    if (!categoryId) {
      throw new Error('Asset group category was not created');
    }
    const values = mockApi.getDataValues(categoryId);
    expect(values).toHaveLength(1);

    const history = mockApi.getHistoryEntries();
    const createdEntry = history.find((entry) => entry.entityType === 'asset-group' && entry.entityId === group.id);
    expect(createdEntry).toBeDefined();
    expect(createdEntry?.action).toBe('created');
  });

  it('updates asset groups and tracks field changes', async () => {
    vi.spyOn(provider, 'updateAsset').mockResolvedValue({ id: 'asset-1' } as Asset);

    const created = await provider.createAssetGroup({
      name: 'Lighting Rig',
      category: { id: 'cat-audio', name: 'Audio' },
      inheritanceRules: {},
      customFieldRules: {},
      memberAssetIds: ['asset-1'],
    });

    const updateAssetSpy = vi
      .spyOn(provider, 'updateAsset')
      .mockResolvedValue({ id: 'asset-1' } as Asset);

    const updated = await provider.updateAssetGroup(created.id, {
      name: 'Lighting Rig XL',
      memberAssetIds: ['asset-1', 'asset-2'],
      memberCount: 2,
    });

    expect(updated.name).toBe('Lighting Rig XL');
    expect(updated.memberAssetIds).toEqual(['asset-1', 'asset-2']);

    expect(updateAssetSpy).toHaveBeenCalledWith('asset-2', {
      assetGroup: {
        id: created.id,
        groupNumber: created.groupNumber,
        name: 'Lighting Rig XL',
      },
    });

    const history = mockApi.getHistoryEntries();
    const updateEntry = history.find((entry) => entry.entityType === 'asset-group' && entry.action === 'updated');
    expect(updateEntry?.changes?.some((change) => change.field === 'name')).toBe(true);
  });

  it('prevents deleting groups with members without reassignment option', async () => {
    vi.spyOn(provider, 'updateAsset').mockResolvedValue({ id: 'asset-1' } as Asset);

    const created = await provider.createAssetGroup({
      name: 'Mic Pack',
      category: { id: 'cat-audio', name: 'Audio' },
      inheritanceRules: {},
      customFieldRules: {},
      memberAssetIds: ['asset-1'],
    });

    await expect(provider.deleteAssetGroup(created.id)).rejects.toThrow(/Cannot delete asset group/);
  });

  it('deletes groups with reassignment and records history', async () => {
    const updateAssetSpy = vi
      .spyOn(provider, 'updateAsset')
      .mockResolvedValue({ id: 'asset-1' } as Asset);

    const created = await provider.createAssetGroup({
      name: 'Audio Bundle',
      category: { id: 'cat-audio', name: 'Audio' },
      inheritanceRules: {},
      customFieldRules: {},
      memberAssetIds: ['asset-1'],
    });

    await provider.deleteAssetGroup(created.id, { reassignAssets: true });

    expect(updateAssetSpy).toHaveBeenCalledWith('asset-1', {
      assetGroup: undefined,
      fieldSources: undefined,
    });

    const categoryId = await getAssetGroupCategoryId();
    expect(categoryId).toBeDefined();
    if (!categoryId) {
      throw new Error('Asset group category missing after deletion');
    }
    const values = mockApi.getDataValues(categoryId);
    expect(values).toHaveLength(0);

    const history = mockApi.getHistoryEntries();
    const deleteEntry = history.find((entry) => entry.entityId === created.id && entry.action === 'deleted');
    expect(deleteEntry).toBeDefined();
  });
});
