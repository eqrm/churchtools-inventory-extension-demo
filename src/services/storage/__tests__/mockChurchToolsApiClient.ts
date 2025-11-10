import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type { ChangeHistoryEntry } from '../../../types/entities';

interface CategoryRecord extends Record<string, unknown> {
  id: string;
  name: string;
  shorty?: string;
  description?: string | null;
  data?: string | null;
  customModuleId: number;
}

interface DataValueRecord extends Record<string, unknown> {
  id: string;
  dataCategoryId: number;
  value: string;
}

type CreateDataCategoryPayload = Record<string, unknown> & {
  name: string;
  shorty?: string;
  description?: string | null;
  data?: string | null;
  customModuleId?: number;
};

type CreateDataValuePayload = Record<string, unknown> & {
  dataCategoryId: number;
  value: string;
};

export interface MockChurchToolsApi {
  client: ChurchToolsAPIClient;
  seedCategory(category: CategoryRecord): void;
  getAssetTypeRecord(id: string): CategoryRecord | undefined;
  getDataValues(categoryId: string): DataValueRecord[];
  getHistoryEntries(): ChangeHistoryEntry[];
}

export function createMockChurchToolsApi(moduleId: string): MockChurchToolsApi {
  const categories = new Map<string, CategoryRecord>();
  const dataValues = new Map<string, Map<string, DataValueRecord>>();
  let nextId = 1;

  const ensureCategoryMap = (categoryId: string) => {
    let map = dataValues.get(categoryId);
    if (!map) {
      map = new Map();
      dataValues.set(categoryId, map);
    }
    return map;
  };

  const client: ChurchToolsAPIClient = {
    get: async () => undefined,
    post: async () => undefined,
    put: async () => undefined,
    delete: async () => undefined,
    getCurrentUser: async () => ({
      id: 'user-1',
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: undefined,
    }),
    getPersonInfo: async (personId: string) => ({
      id: personId,
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: undefined,
    }),
    getDataCategories: async (requestedModuleId: string) => {
      return Array.from(categories.values()).filter((category) =>
        category.customModuleId === Number(requestedModuleId),
      );
    },
    getDataCategory: async (_moduleId: string, categoryId: string) => {
      return categories.get(categoryId) ?? null;
    },
    createDataCategory: async (_moduleId: string, payload: CreateDataCategoryPayload) => {
      const id = String(nextId++);
      const category: CategoryRecord = {
        id,
        customModuleId: Number(moduleId),
        createdAt: new Date().toISOString(),
        createdBy: 'user-1',
        createdByName: 'Test User',
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: 'user-1',
        lastModifiedByName: 'Test User',
        ...payload,
      };
      categories.set(id, category);
      ensureCategoryMap(id);
      return category;
    },
    updateDataCategory: async (_moduleId: string, categoryId: string, payload: Record<string, unknown>) => {
      const existing = categories.get(categoryId);
      if (!existing) {
        throw new Error(`Category ${categoryId} not found`);
      }
      const updated: CategoryRecord = {
        ...existing,
        ...payload,
        lastModifiedAt: new Date().toISOString(),
      };
      categories.set(categoryId, updated);
      return updated;
    },
    deleteDataCategory: async (_moduleId: string, categoryId: string) => {
      if (!categories.has(categoryId)) {
        throw new Error(`Category ${categoryId} not found`);
      }
      categories.delete(categoryId);
      dataValues.delete(categoryId);
    },
    getDataValues: async (_moduleId: string, categoryId: string) => {
      return Array.from(ensureCategoryMap(categoryId).values());
    },
    getDataValue: async (_moduleId: string, categoryId: string, dataValueId: string) => {
      const categoryData = ensureCategoryMap(categoryId);
      const value = categoryData.get(dataValueId);
      if (!value) {
        throw new Error(`Data value ${dataValueId} not found`);
      }
      return value;
    },
    createDataValue: async (_moduleId: string, categoryId: string, payload: CreateDataValuePayload) => {
      const id = String(nextId++);
      const record: DataValueRecord = {
        id,
        ...payload,
        dataCategoryId: Number(categoryId),
      };
      ensureCategoryMap(categoryId).set(id, record);
      return record;
    },
    updateDataValue: async (_moduleId: string, categoryId: string, dataValueId: string, payload: Record<string, unknown>) => {
      const categoryData = ensureCategoryMap(categoryId);
      const existing = categoryData.get(dataValueId);
      if (!existing) {
        throw new Error(`Data value ${dataValueId} not found`);
      }
      const updated: DataValueRecord = {
        ...existing,
        ...payload,
      };
      categoryData.set(dataValueId, updated);
      return updated;
    },
    deleteDataValue: async (_moduleId: string, categoryId: string, dataValueId: string) => {
      ensureCategoryMap(categoryId).delete(dataValueId);
    },
  } as unknown as ChurchToolsAPIClient;

  const seedCategory = (category: CategoryRecord) => {
    const { customModuleId, ...rest } = category;
    categories.set(category.id, {
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      createdByName: 'Test User',
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: 'user-1',
      lastModifiedByName: 'Test User',
      customModuleId: customModuleId ?? Number(moduleId),
      ...rest,
    });
    ensureCategoryMap(category.id);
  };

  const getHistoryEntries = (): ChangeHistoryEntry[] => {
    const historyCategory = Array.from(categories.values()).find(
      (category) => category.name === '__ChangeHistory__',
    );

    if (!historyCategory) {
      return [];
    }

    const entries = ensureCategoryMap(historyCategory.id);
    return Array.from(entries.values()).map((record) => {
      const parsed = JSON.parse(record.value) as ChangeHistoryEntry;
      return {
        ...parsed,
        id: String(record.id),
      };
    });
  };

  return {
    client,
    seedCategory,
    getAssetTypeRecord: (id: string) => categories.get(id),
    getDataValues: (categoryId: string) => Array.from(ensureCategoryMap(categoryId).values()),
    getHistoryEntries,
  };
}
