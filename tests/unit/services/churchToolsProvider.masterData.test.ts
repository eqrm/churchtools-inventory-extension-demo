import { describe, expect, it, vi } from 'vitest';
import { masterDataHandlers } from '../../../src/services/storage/churchToolsProvider/masterData';
import type { MasterDataDependencies } from '../../../src/services/storage/churchToolsProvider/masterData';
import type { ChurchToolsAPIClient } from '../../../src/services/api/ChurchToolsAPIClient';

const ISO_NOW = '2025-01-01T00:00:00.000Z';

type ApiOverrides = Partial<
  Pick<
    ChurchToolsAPIClient,
    | 'getDataCategories'
    | 'createDataCategory'
    | 'getDataValues'
    | 'createDataValue'
    | 'updateDataValue'
    | 'deleteDataValue'
    | 'getCurrentUser'
  >
>;

function buildApiClient(overrides?: ApiOverrides): ChurchToolsAPIClient {
  const apiClient: ApiOverrides = {
    getDataCategories: vi.fn().mockResolvedValue([
      { id: 'category-1', name: '__Locations__' },
    ]),
    createDataCategory: vi.fn().mockResolvedValue({ id: 'category-1', name: '__Locations__' }),
    getDataValues: vi.fn().mockResolvedValue([]),
    createDataValue: vi.fn().mockImplementation(async (_moduleId: string, _categoryId: string, payload: { value: string }) => ({
      id: 'value-1',
      value: payload.value,
    })),
    updateDataValue: vi.fn().mockImplementation(async (_moduleId: string, _categoryId: string, valueId: string, payload: { value: string }) => ({
      id: valueId,
      value: payload.value,
    })),
    deleteDataValue: vi.fn().mockResolvedValue(undefined),
    getCurrentUser: vi.fn().mockResolvedValue({
      id: 'user-1',
      firstName: 'Inventory',
      lastName: 'Admin',
      name: 'Inventory Admin',
      email: 'inventory@example.test',
      avatarUrl: undefined,
    }),
  };

  return { ...apiClient, ...overrides } as ChurchToolsAPIClient;
}

function buildDeps(overrides?: {
  apiClient?: ChurchToolsAPIClient;
  moduleId?: string;
  recordChange?: MasterDataDependencies['recordChange'];
}): MasterDataDependencies {
  return {
    moduleId: overrides?.moduleId ?? 'module-1',
    apiClient: overrides?.apiClient ?? buildApiClient(),
    recordChange: overrides?.recordChange ?? vi.fn().mockResolvedValue(undefined),
  };
}

function buildRawValue(id: string, name: string) {
  return {
    id,
    value: JSON.stringify({ id, name, createdAt: ISO_NOW, updatedAt: ISO_NOW }),
  };
}

describe('churchToolsProvider master data handlers', () => {
  it('creates the hidden category when none exists', async () => {
    const getDataCategories = vi.fn().mockRejectedValue(new Error('missing'));
    const createDataCategory = vi.fn().mockResolvedValue({ id: 'new-cat', name: '__Locations__' });
    const apiClient = buildApiClient({
      getDataCategories,
      createDataCategory,
    });
    const recordChange = vi.fn().mockResolvedValue(undefined);
    const deps = buildDeps({ apiClient, recordChange });

    await masterDataHandlers.getAllMasterDataItems(deps, 'locations');

    expect(createDataCategory).toHaveBeenCalledWith('module-1', expect.objectContaining({
      name: '__Locations__',
    }));
    expect(recordChange).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'master-data',
      entityName: '__Locations__',
      action: 'created',
    }));
  });

  it('creates a master data item and records change history', async () => {
    const apiClient = buildApiClient();
    const recordChange = vi.fn().mockResolvedValue(undefined);
    const deps = buildDeps({ apiClient, recordChange });

    const created = await masterDataHandlers.createMasterDataItem(deps, 'locations', '  Main   Hall  ');

    expect(created.name).toBe('Main Hall');
    const createMock = vi.mocked(apiClient.createDataValue);
    expect(createMock).toHaveBeenCalledWith('module-1', 'category-1', {
      dataCategoryId: expect.any(Number),
      value: expect.any(String),
    });
    const payloadArg = createMock.mock.calls[0]?.[2] as { value: string } | undefined;
    expect(payloadArg).toBeDefined();
    const payload = JSON.parse(payloadArg!.value);
    expect(payload).toMatchObject({ name: 'Main Hall', createdBy: 'user-1' });
    expect(recordChange).toHaveBeenCalledWith(expect.objectContaining({
      action: 'created',
      entityName: 'Main Hall',
    }));
  });

  it('prevents duplicate names ignoring case', async () => {
    const rawItem = buildRawValue('value-1', 'Main Hall');
    const apiClient = buildApiClient({
      getDataValues: vi.fn().mockResolvedValue([rawItem]),
    });
    const deps = buildDeps({ apiClient });

    await expect(
      masterDataHandlers.createMasterDataItem(deps, 'locations', 'main hall'),
    ).rejects.toThrow(/already exists/);
    expect(vi.mocked(apiClient.createDataValue)).not.toHaveBeenCalled();
  });

  it('updates existing master data items', async () => {
    const rawItem = buildRawValue('value-1', 'Main Hall');
    const apiClient = buildApiClient({
      getDataValues: vi.fn().mockResolvedValue([rawItem]),
    });
    const deps = buildDeps({ apiClient });

    const updated = await masterDataHandlers.updateMasterDataItem(deps, 'locations', 'value-1', 'Lobby');

    expect(updated.name).toBe('Lobby');
    const updateMock = vi.mocked(apiClient.updateDataValue);
    expect(updateMock).toHaveBeenCalledWith('module-1', 'category-1', 'value-1', {
      id: expect.any(Number),
      dataCategoryId: expect.any(Number),
      value: expect.stringContaining('Lobby'),
    });
  });

  it('deletes existing master data items', async () => {
    const rawItem = buildRawValue('value-1', 'Main Hall');
    const apiClient = buildApiClient({
      getDataValues: vi.fn().mockResolvedValue([rawItem]),
    });
    const recordChange = vi.fn().mockResolvedValue(undefined);
    const deps = buildDeps({ apiClient, recordChange });

    await masterDataHandlers.deleteMasterDataItem(deps, 'locations', 'value-1');

    expect(vi.mocked(apiClient.deleteDataValue)).toHaveBeenCalledWith('module-1', 'category-1', 'value-1');
    expect(recordChange).toHaveBeenCalledWith(expect.objectContaining({
      action: 'deleted',
      entityName: 'Main Hall',
    }));
  });
});
