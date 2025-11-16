import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type { AssetType, ChangeHistoryEntry } from '../../../types/entities';
import { CURRENT_SCHEMA_VERSION } from '../../migrations/constants';
import type { AssetModel, AssetModelCreate, AssetModelUpdate } from '../../../types/model';

type NormalizeableValue = Record<string, unknown> | string | null | undefined;

export interface AssetModelDependencies {
  moduleId: string
  apiClient: ChurchToolsAPIClient
  getAllAssetTypesIncludingHistory(): Promise<AssetType[]>
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>
}

const CATEGORY_NAME = '__AssetModels__';

export async function getAssetModels(deps: AssetModelDependencies): Promise<AssetModel[]> {
  const category = await resolveAssetModelCategory(deps)
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id)
  return values.map((record) => mapToAssetModel(record))
}

export async function getAssetModel(deps: AssetModelDependencies, id: string): Promise<AssetModel | null> {
  const models = await getAssetModels(deps)
  return models.find((model) => model.id === id) ?? null
}

export async function createAssetModel(
  deps: AssetModelDependencies,
  data: AssetModelCreate,
): Promise<AssetModel> {
  const category = await resolveAssetModelCategory(deps)
  const user = await deps.apiClient.getCurrentUser()
  const now = new Date().toISOString()
  const payload = buildAssetModelPayload({
    id: undefined,
    name: data.name,
    assetTypeId: data.assetTypeId,
    manufacturer: data.manufacturer,
    modelNumber: data.modelNumber,
    defaultWarrantyMonths: data.defaultWarrantyMonths,
    defaultValues: data.defaultValues,
    tagIds: data.tagIds,
    createdBy: user.id,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
  });

  const dataValue = {
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  };

  const created = await deps.apiClient.createDataValue(deps.moduleId, category.id, dataValue)
  const model = mapToAssetModel(created)

  await deps.recordChange({
    entityType: 'model',
    entityId: model.id,
    entityName: model.name,
    action: 'created',
    changedBy: user.id,
    changedByName: user.name,
  });

  return model
}

export async function updateAssetModel(
  deps: AssetModelDependencies,
  id: string,
  data: AssetModelUpdate,
): Promise<AssetModel> {
  const existing = await getAssetModel(deps, id)
  if (!existing) {
    throw new Error(`Asset model ${id} not found`)
  }

  const category = await resolveAssetModelCategory(deps)
  const user = await deps.apiClient.getCurrentUser()
  const now = new Date().toISOString()

  const payload = buildAssetModelPayload({
    id,
    name: data.name ?? existing.name,
    assetTypeId: data.assetTypeId ?? existing.assetTypeId,
    manufacturer: data.manufacturer ?? existing.manufacturer,
    modelNumber: data.modelNumber ?? existing.modelNumber,
    defaultWarrantyMonths:
      data.defaultWarrantyMonths ?? existing.defaultWarrantyMonths,
    defaultValues: data.defaultValues ?? existing.defaultValues,
    tagIds: data.tagIds ?? existing.tagIds,
    createdBy: existing.createdBy,
    createdByName: existing.createdByName,
    createdAt: existing.createdAt,
    updatedAt: now,
  })

  const dataValue = {
    id: Number(id),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  }

  const updated = await deps.apiClient.updateDataValue(deps.moduleId, category.id, id, dataValue)
  const model = mapToAssetModel(updated)

  await deps.recordChange({
    entityType: 'model',
    entityId: model.id,
    entityName: model.name,
    action: 'updated',
    changedBy: user.id,
    changedByName: user.name,
  })

  return model
}

export async function deleteAssetModel(deps: AssetModelDependencies, id: string): Promise<void> {
  const existing = await getAssetModel(deps, id)
  if (!existing) {
    throw new Error(`Asset model ${id} not found`)
  }

  const category = await resolveAssetModelCategory(deps)
  const user = await deps.apiClient.getCurrentUser()

  await deps.apiClient.deleteDataValue(deps.moduleId, category.id, id)

  await deps.recordChange({
    entityType: 'model',
    entityId: existing.id,
    entityName: existing.name,
    action: 'deleted',
    changedBy: user.id,
    changedByName: user.name,
  })
}

function buildAssetModelPayload(entry: {
  id?: string | undefined
  name: unknown
  assetTypeId: unknown
  manufacturer?: unknown
  modelNumber?: unknown
  defaultWarrantyMonths?: unknown
  defaultValues?: NormalizeableValue
  tagIds?: unknown
  createdBy: unknown
  createdByName?: unknown
  createdAt: string
  updatedAt: string
}): Record<string, unknown> {
  return {
    name: String(entry.name),
    assetTypeId: String(entry.assetTypeId),
    manufacturer: normalizeString(entry.manufacturer),
    modelNumber: normalizeString(entry.modelNumber),
    defaultWarrantyMonths: normalizeNumber(entry.defaultWarrantyMonths),
    defaultValues: normalizeDefaultValues(entry.defaultValues),
    tagIds: normalizeTagIds(entry.tagIds),
    createdBy: String(entry.createdBy),
    createdByName: entry.createdByName ? String(entry.createdByName) : undefined,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  }
}

function normalizeString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }
  return null
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return value
  }
  return null
}

function normalizeDefaultValues(value: NormalizeableValue): Record<string, unknown> {
  if (!value) {
    return {}
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
  }

  if (typeof value === 'object') {
    return value as Record<string, unknown>
  }

  return {}
}

function normalizeTagIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry): string | null => (typeof entry === 'string' ? entry.trim() : null))
    .filter((entry): entry is string => Boolean(entry))
}

function mapToAssetModel(raw: unknown): AssetModel {
  const record = raw as Record<string, unknown>
  const value = (record['value'] ?? record['data']) as string | null
  if (!value) {
    throw new Error('Invalid asset model data: missing value payload')
  }

  const parsed = JSON.parse(value) as Record<string, unknown>

  return {
    id: String(record['id']),
    name: String(parsed['name']),
    assetTypeId: String(parsed['assetTypeId']),
    manufacturer: typeof parsed['manufacturer'] === 'string' ? parsed['manufacturer'] : undefined,
    modelNumber: typeof parsed['modelNumber'] === 'string' ? parsed['modelNumber'] : undefined,
    defaultWarrantyMonths: typeof parsed['defaultWarrantyMonths'] === 'number' ? parsed['defaultWarrantyMonths'] : undefined,
    defaultValues: normalizeDefaultValues(parsed['defaultValues'] as NormalizeableValue),
    tagIds: normalizeTagIds(parsed['tagIds']),
    createdBy: String(parsed['createdBy'] ?? parsed['createdById'] ?? 'system'),
    createdByName: typeof parsed['createdByName'] === 'string' ? parsed['createdByName'] : undefined,
    createdAt: String(parsed['createdAt'] ?? parsed['created_at'] ?? new Date().toISOString()),
    updatedAt: String(parsed['updatedAt'] ?? parsed['lastModifiedAt'] ?? record['modified_at'] ?? new Date().toISOString()),
  }
}

async function resolveAssetModelCategory(deps: AssetModelDependencies): Promise<AssetType> {
  const categories = await deps.getAllAssetTypesIncludingHistory()
  let category = categories.find((candidate) => candidate.name === CATEGORY_NAME)

  if (!category) {
    const shorty = `assetmodels_${Date.now().toString().slice(-4)}`
    const payload = {
      customModuleId: Number(deps.moduleId),
      name: CATEGORY_NAME,
      shorty,
      description: 'Internal category for asset model templates',
      data: null,
    }

    const created = await deps.apiClient.createDataCategory(deps.moduleId, payload)
    category = mapToAssetType(created)
  }

  return category
}

function mapToAssetType(data: unknown): AssetType {
  const raw = data as Record<string, unknown>
  return {
    id: String(raw['id']),
    name: String(raw['name']),
    icon: raw['icon'] as AssetType['icon'],
    customFields: [],
    createdBy: String(raw['createdBy'] ?? 'system'),
    createdByName: String(raw['createdByName'] ?? 'System'),
    createdAt: String(raw['createdAt'] ?? new Date().toISOString()),
    lastModifiedBy: String(raw['lastModifiedBy'] ?? 'system'),
    lastModifiedByName: String(raw['lastModifiedByName'] ?? 'System'),
    lastModifiedAt: String(raw['lastModifiedAt'] ?? new Date().toISOString()),
  }
}
