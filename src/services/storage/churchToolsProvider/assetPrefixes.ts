import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type {
  AssetType,
  AssetPrefix,
  AssetPrefixCreate,
  AssetPrefixUpdate,
  ChangeHistoryEntry,
} from '../../../types/entities';

export interface AssetPrefixDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
}

type AssetPrefixCategory = {
  id: string;
  name: string;
};

type CreateDataValuePayload = {
  dataCategoryId: number;
  value: string;
};

type UpdateDataValuePayload = CreateDataValuePayload & {
  id: number;
};

const CATEGORY_NAME = '__AssetPrefixes__';

async function getAssetPrefixesCategory(deps: AssetPrefixDependencies): Promise<AssetPrefixCategory> {
  try {
    const categories = await deps.apiClient.getDataCategories(deps.moduleId);
    const match = (categories as Array<{ id: unknown; name?: unknown }>).find(
      (category) => String(category.name) === CATEGORY_NAME,
    );

    if (match && match.id !== undefined) {
      return {
        id: String(match.id),
        name: CATEGORY_NAME,
      };
    }
  } catch {
    // If fetching categories fails, attempt to create a fresh category
  }

  const user = await deps.apiClient.getCurrentUser();
  const categoryData = {
    customModuleId: Number(deps.moduleId),
    name: CATEGORY_NAME,
    shorty: `assetprefixes_${Date.now().toString().substring(-4)}`,
    description: 'System category for asset prefixes',
    data: null,
  };

  const created = await deps.apiClient.createDataCategory(deps.moduleId, categoryData);
  const mapped = deps.mapToAssetType(created);

  await deps.recordChange({
    entityType: 'category',
    entityId: mapped.id,
    action: 'created',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return {
    id: String(mapped.id),
    name: mapped.name,
  };
}

function mapToAssetPrefix(dataValue: unknown): AssetPrefix {
  const raw = dataValue as Record<string, unknown>;
  const dataStr = (raw['value'] || raw['data']) as string | null;
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : raw;

  return {
    id: String(raw['id'] ?? parsed['id']),
    prefix: String(parsed['prefix'] ?? ''),
    description: String(parsed['description'] ?? ''),
    color: String(parsed['color'] ?? ''),
    sequence: typeof parsed['sequence'] === 'number' ? parsed['sequence'] : Number(parsed['sequence'] ?? 0),
    createdBy: String(parsed['createdBy'] ?? 'system'),
    createdByName: String(parsed['createdByName'] ?? 'System'),
    createdAt: String(parsed['createdAt'] ?? new Date().toISOString()),
    lastModifiedBy: String(parsed['lastModifiedBy'] ?? 'system'),
    lastModifiedByName: String(parsed['lastModifiedByName'] ?? 'System'),
    lastModifiedAt: String(parsed['lastModifiedAt'] ?? new Date().toISOString()),
  };
}

export async function getAssetPrefixes(deps: AssetPrefixDependencies): Promise<AssetPrefix[]> {
  const category = await getAssetPrefixesCategory(deps);
  const dataValues = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  return dataValues.map((value) => mapToAssetPrefix(value));
}

export async function getAssetPrefix(deps: AssetPrefixDependencies, id: string): Promise<AssetPrefix> {
  const prefixes = await getAssetPrefixes(deps);
  const match = prefixes.find((prefix) => prefix.id === id);
  if (!match) {
    throw new Error(`Asset prefix with ID ${id} not found`);
  }
  return match;
}

export async function createAssetPrefix(
  deps: AssetPrefixDependencies,
  data: AssetPrefixCreate,
): Promise<AssetPrefix> {
  try {
    const user = await deps.apiClient.getCurrentUser();
    const category = await getAssetPrefixesCategory(deps);

    const existing = await getAssetPrefixes(deps);
    if (existing.some((prefix) => prefix.prefix === data.prefix)) {
      throw new Error(`Prefix "${data.prefix}" already exists`);
    }

    const prefixPayload = {
      prefix: data.prefix,
      description: data.description,
      color: data.color,
      sequence: 0,
      createdBy: user.id,
      createdByName: `${user.firstName} ${user.lastName}`,
      lastModifiedBy: user.id,
      lastModifiedByName: `${user.firstName} ${user.lastName}`,
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
    };

    const payload: CreateDataValuePayload = {
      dataCategoryId: Number(category.id),
      value: JSON.stringify(prefixPayload),
    };

    const created = await deps.apiClient.createDataValue(deps.moduleId, category.id, payload);
    const prefix = mapToAssetPrefix(created);

    await deps.recordChange({
      entityType: 'asset-prefix',
      entityId: prefix.id,
      action: 'created',
      newValue: `Prefix: ${data.prefix} - ${data.description}`,
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });

    return prefix;
  } catch (error) {
    console.error('[ChurchToolsProvider] Failed to create asset prefix:', error);
    if (error instanceof Error) {
      throw new Error(`Could not create asset prefix: ${error.message}`);
    }
    throw new Error('Could not create asset prefix: Unknown error occurred');
  }
}

export async function updateAssetPrefix(
  deps: AssetPrefixDependencies,
  id: string,
  data: AssetPrefixUpdate,
): Promise<AssetPrefix> {
  const user = await deps.apiClient.getCurrentUser();
  const category = await getAssetPrefixesCategory(deps);
  const current = await getAssetPrefix(deps, id);

  const updatedPayload = {
    ...current,
    ...data,
    lastModifiedBy: user.id,
    lastModifiedByName: `${user.firstName} ${user.lastName}`,
    lastModifiedAt: new Date().toISOString(),
  };

  const payload: UpdateDataValuePayload = {
    id: Number(id),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(updatedPayload),
  };

  const updated = await deps.apiClient.updateDataValue(deps.moduleId, category.id, id, payload);
  const prefix = mapToAssetPrefix(updated);

  await deps.recordChange({
    entityType: 'asset-prefix',
    entityId: id,
    action: 'updated',
    oldValue: JSON.stringify(current),
    newValue: JSON.stringify(data),
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return prefix;
}

export async function deleteAssetPrefix(
  deps: AssetPrefixDependencies,
  id: string,
): Promise<void> {
  const user = await deps.apiClient.getCurrentUser();
  const category = await getAssetPrefixesCategory(deps);
  const prefix = await getAssetPrefix(deps, id);

  await deps.apiClient.deleteDataValue(deps.moduleId, category.id, id);

  await deps.recordChange({
    entityType: 'asset-prefix',
    entityId: id,
    action: 'deleted',
    oldValue: `Prefix: ${prefix.prefix} - ${prefix.description}`,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

export async function incrementPrefixSequence(
  deps: AssetPrefixDependencies,
  prefixId: string,
): Promise<number> {
  const prefix = await getAssetPrefix(deps, prefixId);
  const newSequence = prefix.sequence + 1;

  await updateAssetPrefix(deps, prefixId, {
    sequence: newSequence,
  });

  return newSequence;
}
