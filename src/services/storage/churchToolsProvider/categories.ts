import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type {
  Asset,
  AssetType,
  AssetFilters,
  AssetTypeCreate,
  AssetTypeUpdate,
  ChangeHistoryEntry,
} from '../../../types/entities';
import { normalizeCategoryIconValue } from '../../../utils/iconMigrationMap';

export interface AssetTypeDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  getAllAssetTypesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
  valuesAreEqual(a: unknown, b: unknown): boolean;
  formatFieldValue(value: unknown): string;
  getAssets(filters?: AssetFilters): Promise<Asset[]>;
}

export async function getAssetTypes(deps: AssetTypeDependencies): Promise<AssetType[]> {
  const allAssetTypes = await deps.getAllAssetTypesIncludingHistory();
  return allAssetTypes.filter(
    (assetType) => assetType.name !== '__ChangeHistory__' && assetType.name !== '__AssetGroups__',
  );
}

export async function getAssetType(deps: AssetTypeDependencies, id: string): Promise<AssetType> {
  const assetTypes = await getAssetTypes(deps);
  const assetType = assetTypes.find((entry) => entry.id === id);

  if (!assetType) {
    throw new Error(`Asset type with ID ${id} not found`);
  }

  return assetType;
}

export async function createAssetType(
  deps: AssetTypeDependencies,
  data: AssetTypeCreate,
): Promise<AssetType> {
  const user = await deps.apiClient.getCurrentUser();

  const shorty =
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20) +
    '_' +
    Date.now().toString().substring(-4);

  const rawIconInput = typeof data.icon === 'string' ? data.icon.trim() : undefined;
  const normalizedIcon = rawIconInput ? normalizeCategoryIconValue(rawIconInput) ?? rawIconInput : undefined;

  const payload = {
    customModuleId: Number(deps.moduleId),
    name: data.name,
    shorty,
    description: normalizedIcon ?? null,
    data: data.customFields.length > 0 ? JSON.stringify(data.customFields) : null,
  };

  const created = await deps.apiClient.createDataCategory(deps.moduleId, payload);
  const assetType = deps.mapToAssetType(created);

  await deps.recordChange({
    entityType: 'category',
    entityId: assetType.id,
    action: 'created',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return assetType;
}

export async function updateAssetType(
  deps: AssetTypeDependencies,
  id: string,
  data: AssetTypeUpdate,
): Promise<AssetType> {
  const user = await deps.apiClient.getCurrentUser();
  const existing = await getAssetType(deps, id);

  const rawIconInput =
    data.icon === undefined ? undefined : typeof data.icon === 'string' ? data.icon.trim() : undefined;
  const normalizedIcon = rawIconInput ? normalizeCategoryIconValue(rawIconInput) ?? rawIconInput : undefined;
  const descriptionValue = data.icon === undefined ? existing.icon ?? null : normalizedIcon ?? null;

  const payload: Record<string, unknown> = {
    id: Number(id),
    customModuleId: Number(deps.moduleId),
    name: data.name ?? existing.name,
    shorty: existing.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20),
    description: descriptionValue,
  };

  if (data.customFields !== undefined) {
    payload['data'] = data.customFields.length > 0 ? JSON.stringify(data.customFields) : null;
  } else {
    payload['data'] = existing.customFields.length > 0 ? JSON.stringify(existing.customFields) : null;
  }

  const updated = await deps.apiClient.updateDataCategory(deps.moduleId, id, payload);
  const assetType = deps.mapToAssetType(updated);

  const changes: ChangeHistoryEntry['changes'] = [];
  for (const [field, newValue] of Object.entries(data)) {
    const oldValue = existing[field as keyof AssetType];
    if (!deps.valuesAreEqual(oldValue, newValue)) {
      const formattedOld = deps.formatFieldValue(oldValue);
      const formattedNew = deps.formatFieldValue(newValue);
      if (formattedOld !== formattedNew) {
        changes.push({
          field,
          oldValue: formattedOld,
          newValue: formattedNew,
        });
      }
    }
  }

  if (changes.length > 0) {
    await deps.recordChange({
      entityType: 'category',
      entityId: id,
      action: 'updated',
      changes,
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });
  }

  return assetType;
}

export async function deleteAssetType(deps: AssetTypeDependencies, id: string): Promise<void> {
  const user = await deps.apiClient.getCurrentUser();
  const assets = await deps.getAssets({ assetTypeId: id });

  if (assets.length > 0) {
    throw new Error(
      `Cannot delete asset type: ${assets.length.toString()} asset(s) are still using this type. ` +
        `Please delete or reassign these assets first.`,
    );
  }

  await deps.recordChange({
    entityType: 'category',
    entityId: id,
    action: 'deleted',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  await deps.apiClient.deleteDataCategory(deps.moduleId, id);
}
