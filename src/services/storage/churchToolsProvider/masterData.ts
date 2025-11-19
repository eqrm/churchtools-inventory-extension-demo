import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type { ChangeHistoryEntry } from '../../../types/entities';
import type { MasterDataEntity, MasterDataItem } from '../../../types/masterData';
import { normalizeMasterDataName, canonicalMasterDataName } from '../../../utils/masterData';

export interface MasterDataDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
}

interface MasterDataCategory {
  id: string;
  name: string;
}

interface MasterDataConfig {
  categoryName: string;
  shortyPrefix: string;
  description: string;
}

export type SupportedMasterDataEntity = Exclude<MasterDataEntity, 'maintenanceCompanies'>;

const MASTER_DATA_CONFIG: Record<SupportedMasterDataEntity, MasterDataConfig> = {
  locations: {
    categoryName: '__Locations__',
    shortyPrefix: 'locations_',
    description: 'System category for asset locations',
  },
  manufacturers: {
    categoryName: '__Manufacturers__',
    shortyPrefix: 'manufacturers_',
    description: 'System category for asset manufacturers',
  },
  models: {
    categoryName: '__Models__',
    shortyPrefix: 'models_',
    description: 'System category for asset models',
  },
};

export function isSupportedEntity(entity: MasterDataEntity): entity is SupportedMasterDataEntity {
  return entity !== 'maintenanceCompanies';
}

async function resolveCategory(
  deps: MasterDataDependencies,
  entity: SupportedMasterDataEntity,
): Promise<MasterDataCategory> {
  const config = MASTER_DATA_CONFIG[entity];

  try {
    const categories = await deps.apiClient.getDataCategories(deps.moduleId);
    const match = (categories as Array<{ id: unknown; name?: unknown }>).find(
      (category) => String(category.name) === config.categoryName,
    );

    if (match && match.id !== undefined) {
      return { id: String(match.id), name: config.categoryName };
    }
  } catch {
    // fall through to creation path
  }

  const user = await deps.apiClient.getCurrentUser();
  const created = await deps.apiClient.createDataCategory(deps.moduleId, {
    customModuleId: Number(deps.moduleId),
    name: config.categoryName,
    shorty: `${config.shortyPrefix}${Date.now().toString().slice(-4)}`,
    description: config.description,
    data: null,
  });

  await deps.recordChange({
    entityType: 'master-data',
    entityId: String((created as { id?: unknown }).id ?? config.categoryName),
    entityName: config.categoryName,
    action: 'created',
    changedBy: user.id,
    changedByName: user.name ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
  });

  return { id: String((created as { id?: unknown }).id ?? config.categoryName), name: config.categoryName };
}

function mapToMasterDataItem(raw: unknown): MasterDataItem {
  const record = raw as Record<string, unknown>;
  const dataStr = (record['value'] || record['data']) as string | null;
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : {};

  return {
    id: String(record['id'] ?? parsed['id'] ?? ''),
    name: String(parsed['name'] ?? ''),
    createdBy: parsed['createdBy'] ? String(parsed['createdBy']) : undefined,
    createdByName: parsed['createdByName'] ? String(parsed['createdByName']) : undefined,
    createdAt: parsed['createdAt'] ? String(parsed['createdAt']) : undefined,
    updatedAt: parsed['updatedAt'] ? String(parsed['updatedAt']) : undefined,
  };
}

export async function getAllMasterDataItems(
  deps: MasterDataDependencies,
  entity: SupportedMasterDataEntity,
): Promise<MasterDataItem[]> {
  const category = await resolveCategory(deps, entity);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  return values.map((value) => mapToMasterDataItem(value));
}

async function ensureUniqueName(
  deps: MasterDataDependencies,
  entity: SupportedMasterDataEntity,
  name: string,
  ignoreId?: string,
): Promise<void> {
  const canonical = canonicalMasterDataName(name);
  const existing = await getAllMasterDataItems(deps, entity);
  const conflict = existing.find(
    (item) => canonicalMasterDataName(item.name) === canonical && item.id !== ignoreId,
  );

  if (conflict) {
    throw new Error(`An entry named "${name}" already exists`);
  }
}

export async function createMasterDataItem(
  deps: MasterDataDependencies,
  entity: SupportedMasterDataEntity,
  name: string,
): Promise<MasterDataItem> {
  const normalized = normalizeMasterDataName(name);
  if (!normalized) {
    throw new Error('Name is required');
  }

  await ensureUniqueName(deps, entity, normalized);
  const category = await resolveCategory(deps, entity);
  const user = await deps.apiClient.getCurrentUser();
  const now = new Date().toISOString();

  const payload = {
    name: normalized,
    createdBy: user.id,
    createdByName: user.name ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    createdAt: now,
    updatedAt: now,
  };

  const value = {
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  };

  const created = await deps.apiClient.createDataValue(deps.moduleId, category.id, value);
  const item = mapToMasterDataItem(created);

  await deps.recordChange({
    entityType: 'master-data',
    entityId: item.id,
    entityName: item.name,
    action: 'created',
    changedBy: user.id,
    changedByName: payload.createdByName,
  });

  return item;
}

export async function updateMasterDataItem(
  deps: MasterDataDependencies,
  entity: SupportedMasterDataEntity,
  id: string,
  name: string,
): Promise<MasterDataItem> {
  const normalized = normalizeMasterDataName(name);
  if (!normalized) {
    throw new Error('Name is required');
  }

  const items = await getAllMasterDataItems(deps, entity);
  const existing = items.find((item) => item.id === id);
  if (!existing) {
    throw new Error(`Entry ${id} not found`);
  }

  await ensureUniqueName(deps, entity, normalized, id);
  const category = await resolveCategory(deps, entity);
  const user = await deps.apiClient.getCurrentUser();
  const now = new Date().toISOString();

  const payload = {
    ...existing,
    name: normalized,
    updatedAt: now,
  };

  const value = {
    id: Number(id),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  };

  const updated = await deps.apiClient.updateDataValue(deps.moduleId, category.id, id, value);
  const item = mapToMasterDataItem(updated);

  await deps.recordChange({
    entityType: 'master-data',
    entityId: item.id,
    entityName: item.name,
    action: 'updated',
    changedBy: user.id,
    changedByName: user.name ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
  });

  return item;
}

export async function deleteMasterDataItem(
  deps: MasterDataDependencies,
  entity: SupportedMasterDataEntity,
  id: string,
): Promise<void> {
  const items = await getAllMasterDataItems(deps, entity);
  const existing = items.find((item) => item.id === id);
  if (!existing) {
    throw new Error(`Entry ${id} not found`);
  }

  const category = await resolveCategory(deps, entity);
  const user = await deps.apiClient.getCurrentUser();
  await deps.apiClient.deleteDataValue(deps.moduleId, category.id, id);

  await deps.recordChange({
    entityType: 'master-data',
    entityId: id,
    entityName: existing.name,
    action: 'deleted',
    changedBy: user.id,
    changedByName: user.name ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
  });
}

export const masterDataHandlers = {
  isSupportedEntity,
  getAllMasterDataItems,
  createMasterDataItem,
  updateMasterDataItem,
  deleteMasterDataItem,
};
