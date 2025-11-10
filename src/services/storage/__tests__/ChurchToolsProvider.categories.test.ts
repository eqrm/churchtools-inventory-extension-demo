import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChurchToolsStorageProvider } from '../ChurchToolsProvider';
import { createMockChurchToolsApi } from './mockChurchToolsApiClient';
import type { Asset } from '../../../types/entities';

const MODULE_ID = '42';

describe('ChurchToolsStorageProvider - Categories', () => {
  let mockApi: ReturnType<typeof createMockChurchToolsApi>;
  let provider: ChurchToolsStorageProvider;

  beforeEach(() => {
    mockApi = createMockChurchToolsApi(MODULE_ID);
    provider = new ChurchToolsStorageProvider(MODULE_ID, mockApi.client);
    mockApi.seedCategory({
      id: 'cat-1',
      name: 'Audio',
      shorty: 'audio',
      description: null,
      data: JSON.stringify([{ id: 'field-1', name: 'Brand', type: 'text', required: false }]),
      customModuleId: Number(MODULE_ID),
    });
    mockApi.seedCategory({
      id: 'cat-hidden',
      name: '__ChangeHistory__',
      shorty: 'history',
      description: null,
      data: null,
      customModuleId: Number(MODULE_ID),
    });
  });

  it('returns user-facing categories and omits system categories', async () => {
    const categories = await provider.getAssetTypes();
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Audio');
    expect(categories[0].customFields).toHaveLength(1);
  });

  it('retrieves a category by id', async () => {
    const category = await provider.getAssetType('cat-1');
    expect(category?.name).toBe('Audio');
  });

  it('creates a category with icon normalization and logs history', async () => {
    const created = await provider.createAssetType({
      name: 'Video',
      icon: 'video-camera',
      customFields: [
        { id: 'resolution', name: 'Resolution', type: 'select', required: true, options: ['HD', '4K'] },
      ],
    });

    expect(created.name).toBe('Video');
    expect(created.customFields).toHaveLength(1);

    const history = mockApi.getHistoryEntries();
    expect(history.some((entry) => entry.entityType === 'category' && entry.action === 'created')).toBe(true);
  });

  it('updates a category and records field-level changes', async () => {
    const before = await provider.getAssetType('cat-1');
    expect(before?.icon).toBeUndefined();

    const updated = await provider.updateAssetType('cat-1', {
      icon: 'IconMicrophone',
      name: 'Audio Equipment',
    });

    expect(updated.name).toBe('Audio Equipment');
    expect(updated.icon).toBe('IconMicrophone');

    const history = mockApi.getHistoryEntries();
    const updateEntry = history.find((entry) => entry.entityId === 'cat-1' && entry.action === 'updated');
    expect(updateEntry?.changes?.some((change) => change.field === 'name')).toBe(true);
  });

  it('refuses to delete a category that still has assets', async () => {
    vi.spyOn(provider, 'getAssets').mockResolvedValueOnce([
      { id: 'asset-0' } as Asset,
    ]);

    await expect(provider.deleteAssetType('cat-1')).rejects.toThrow(/Cannot delete category/);
  });

  it('deletes an empty category and logs history', async () => {
    vi.spyOn(provider, 'getAssets').mockResolvedValueOnce([]);

    await provider.deleteAssetType('cat-1');

    const categories = await provider.getAssetTypes();
    expect(categories).toHaveLength(0);

    const history = mockApi.getHistoryEntries();
    expect(history.some((entry) => entry.entityId === 'cat-1' && entry.action === 'deleted')).toBe(true);
  });
});
