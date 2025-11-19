import { describe, expect, it, vi } from 'vitest';
import type { ChurchToolsAPIClient } from '../../../src/services/api/ChurchToolsAPIClient';
import {
  getModuleDefaultPrefixId,
  setModuleDefaultPrefixId,
  getPersonDefaultPrefixId,
  setPersonDefaultPrefixId,
} from '../../../src/services/storage/churchToolsProvider/prefixPreferences';

type PrefixPreferenceDependencies = Parameters<typeof getModuleDefaultPrefixId>[0];

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
  const api: ApiOverrides = {
    getDataCategories: vi.fn().mockResolvedValue([
      { id: 'category-1', name: '__PrefixPreferences__' },
    ]),
    createDataCategory: vi.fn().mockResolvedValue({ id: 'category-1', name: '__PrefixPreferences__' }),
    getDataValues: vi.fn().mockResolvedValue([]),
    createDataValue: vi.fn().mockResolvedValue({ id: 'pref-1' }),
    updateDataValue: vi.fn().mockResolvedValue({ id: 'pref-1' }),
    deleteDataValue: vi.fn().mockResolvedValue(undefined),
    getCurrentUser: vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Inventory Admin',
      firstName: 'Inventory',
      lastName: 'Admin',
      email: 'inventory@example.test',
      avatarUrl: undefined,
    }),
  };

  return { ...api, ...overrides } as ChurchToolsAPIClient;
}

function buildDeps(overrides?: {
  apiClient?: ChurchToolsAPIClient;
  recordChange?: PrefixPreferenceDependencies['recordChange'];
  moduleId?: string;
}): PrefixPreferenceDependencies {
  return {
    moduleId: overrides?.moduleId ?? 'module-1',
    apiClient: overrides?.apiClient ?? buildApiClient(),
    recordChange: overrides?.recordChange ?? vi.fn().mockResolvedValue(undefined),
  };
}

function buildStoredPreference(options?: {
  id?: string;
  entryType?: 'module' | 'person';
  personId?: string;
  prefixId?: string | null;
}) {
  const {
    id = 'pref-1',
    entryType = 'module',
    personId,
    prefixId = 'prefix-1',
  } = options ?? {};

  return {
    id,
    value: JSON.stringify({ entryType, personId: personId ?? null, prefixId }),
  };
}

describe('churchToolsProvider prefix preferences', () => {
  it('creates the module default prefix when none exists', async () => {
    const apiClient = buildApiClient();
    const recordChange = vi.fn().mockResolvedValue(undefined);
    const deps = buildDeps({ apiClient, recordChange });

    await setModuleDefaultPrefixId(deps, 'prefix-42');

    expect(vi.mocked(apiClient.createDataValue)).toHaveBeenCalledWith('module-1', 'category-1', {
      dataCategoryId: expect.any(Number),
      value: expect.any(String),
    });
    expect(recordChange).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'asset-prefix',
      entityId: 'module-default-prefix',
      action: 'updated',
    }));
  });

  it('removes the module default when prefix is cleared', async () => {
    const apiClient = buildApiClient({
      getDataValues: vi.fn().mockResolvedValue([
        buildStoredPreference({ prefixId: 'prefix-1' }),
      ]),
    });
    const recordChange = vi.fn().mockResolvedValue(undefined);
    const deps = buildDeps({ apiClient, recordChange });

    await setModuleDefaultPrefixId(deps, null);

    expect(vi.mocked(apiClient.deleteDataValue)).toHaveBeenCalledWith('module-1', 'category-1', 'pref-1');
    expect(recordChange).not.toHaveBeenCalled();
  });

  it('updates a personal default prefix for a specific person', async () => {
    const apiClient = buildApiClient({
      getDataValues: vi.fn().mockResolvedValue([
        buildStoredPreference({ entryType: 'person', personId: 'person-1', prefixId: 'old-prefix' }),
      ]),
    });
    const recordChange = vi.fn().mockResolvedValue(undefined);
    const deps = buildDeps({ apiClient, recordChange });

    await setPersonDefaultPrefixId(deps, 'person-1', 'new-prefix');

    expect(vi.mocked(apiClient.updateDataValue)).toHaveBeenCalledWith('module-1', 'category-1', 'pref-1', {
      id: expect.any(Number),
      dataCategoryId: expect.any(Number),
      value: expect.any(String),
    });
    expect(recordChange).toHaveBeenCalledWith(expect.objectContaining({
      entityId: 'person-default-prefix:person-1',
      newValue: JSON.stringify({ prefixId: 'new-prefix', personId: 'person-1', type: 'person' }),
    }));
  });

  it('retrieves stored module and personal defaults', async () => {
    const modulePref = buildStoredPreference({ prefixId: 'module-prefix' });
    const personPref = buildStoredPreference({ entryType: 'person', personId: 'person-7', prefixId: 'person-prefix' });
    const apiClient = buildApiClient({
      getDataValues: vi.fn().mockResolvedValue([modulePref, personPref]),
    });
    const deps = buildDeps({ apiClient });

    await expect(getModuleDefaultPrefixId(deps)).resolves.toBe('module-prefix');
    await expect(getPersonDefaultPrefixId(deps, 'person-7')).resolves.toBe('person-prefix');
  });
});
