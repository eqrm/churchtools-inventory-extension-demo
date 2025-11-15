import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import { ChurchToolsAPIError } from '../../api/ChurchToolsAPIError';
import type { AssetType, ChangeHistoryEntry } from '../../../types/entities';
import type {
  DamageReportCreateInput,
  DamageReportRecord,
  DamageRepairInput,
} from '../../../types/damage';
import { CURRENT_SCHEMA_VERSION } from '../../migrations/constants';

export interface DamageDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  getAllCategoriesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
}

const DAMAGE_CATEGORY_NAME = '__DamageReports__';
const DAMAGE_CATEGORY_DESCRIPTION = 'Internal category for damage reports';

export async function getDamageReports(
  deps: DamageDependencies,
  assetId: string,
): Promise<DamageReportRecord[]> {
  const category = await getDamageReportsCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  const records = values.map((value) => mapToDamageReportRecord(value));

  return records
    .filter((record) => record.assetId === assetId)
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
}

export async function getDamageReport(
  deps: DamageDependencies,
  reportId: string,
): Promise<DamageReportRecord | null> {
  const category = await getDamageReportsCategory(deps);
  try {
    const value = await deps.apiClient.getDataValue(deps.moduleId, category.id, reportId);
    return mapToDamageReportRecord(value);
  } catch (error) {
    if (error instanceof ChurchToolsAPIError && error.is(405)) {
      console.warn(`[Damage] getDataValue returned 405 for damage report ${reportId}, falling back to list endpoint.`);
      const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
      const records = values.map((value) => mapToDamageReportRecord(value));
      const match = records.find((record) => record.id === reportId);
      return match ?? null;
    }

    console.warn(`[Damage] Failed to fetch damage report ${reportId}:`, error);
    return null;
  }
}

export async function createDamageReport(
  deps: DamageDependencies,
  assetId: string,
  data: DamageReportCreateInput,
): Promise<DamageReportRecord> {
  const category = await getDamageReportsCategory(deps);
  const user = await deps.apiClient.getCurrentUser();
  const now = new Date().toISOString();

  const payload = {
    assetId,
    description: data.description,
    photos: [...data.photoHandles],
    status: data.status ?? 'broken',
    reportedBy: data.reportedBy,
    reportedByName: data.reportedByName,
    reportedAt: data.reportedAt,
    repairNotes: null,
    repairedBy: null,
    repairedByName: null,
    repairedAt: null,
    createdAt: now,
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  } satisfies Record<string, unknown>;

  const valueData = {
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  };

  const created = await deps.apiClient.createDataValue(
    deps.moduleId,
    category.id,
    valueData,
  );

  const record = mapToDamageReportRecord(created);

  await deps.recordChange({
    entityType: 'damage-report',
    entityId: record.id,
    action: 'created',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return record;
}

export async function markDamageReportAsRepaired(
  deps: DamageDependencies,
  reportId: string,
  repair: DamageRepairInput,
): Promise<DamageReportRecord> {
  const existing = await getDamageReport(deps, reportId);
  if (!existing) {
    throw new Error(`Damage report ${reportId} not found`);
  }

  if (existing.status === 'repaired') {
    throw new Error('Damage report already marked as repaired');
  }

  const updates: Partial<DamageReportRecord> = {
    status: 'repaired',
    repairNotes: repair.repairNotes,
    repairedBy: repair.repairedBy,
    repairedByName: repair.repairedByName,
    repairedAt: repair.repairedAt,
    updatedAt: repair.repairedAt,
  };

  return updateDamageReport(deps, reportId, updates, existing);
}

export async function updateDamageReport(
  deps: DamageDependencies,
  reportId: string,
  updates: Partial<DamageReportRecord>,
  existing?: DamageReportRecord | null,
): Promise<DamageReportRecord> {
  const current = existing ?? (await getDamageReport(deps, reportId));
  if (!current) {
    throw new Error(`Damage report ${reportId} not found`);
  }

  const category = await getDamageReportsCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  const payload = {
    assetId: current.assetId,
    description: updates.description ?? current.description,
    photos: updates.photoHandles ?? current.photoHandles,
    status: updates.status ?? current.status,
    reportedBy: current.reportedBy,
    reportedByName: current.reportedByName,
    reportedAt: current.reportedAt,
    repairNotes: updates.repairNotes ?? current.repairNotes ?? null,
    repairedBy: updates.repairedBy ?? current.repairedBy ?? null,
    repairedByName: updates.repairedByName ?? current.repairedByName ?? null,
    repairedAt: updates.repairedAt ?? current.repairedAt ?? null,
    createdAt: current.createdAt,
    updatedAt: updates.updatedAt ?? new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  } satisfies Record<string, unknown>;

  const valueData = {
    id: Number(reportId),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  };

  const updated = await deps.apiClient.updateDataValue(
    deps.moduleId,
    category.id,
    reportId,
    valueData,
  );

  const result = mapToDamageReportRecord(updated);

  await deps.recordChange({
    entityType: 'damage-report',
    entityId: result.id,
    action: 'updated',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return result;
}

export async function deleteDamageReport(
  deps: DamageDependencies,
  reportId: string,
): Promise<void> {
  const existing = await getDamageReport(deps, reportId);
  if (!existing) {
    return;
  }

  const category = await getDamageReportsCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  await deps.apiClient.deleteDataValue(deps.moduleId, category.id, reportId);

  await deps.recordChange({
    entityType: 'damage-report',
    entityId: reportId,
    action: 'deleted',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

async function getDamageReportsCategory(deps: DamageDependencies): Promise<AssetType> {
  const categories = await deps.getAllCategoriesIncludingHistory();
  let category = categories.find((cat) => cat.name === DAMAGE_CATEGORY_NAME);

  if (!category) {
    const user = await deps.apiClient.getCurrentUser();
    const shortSuffix = Date.now().toString().slice(-4);
    const payload = {
      customModuleId: Number(deps.moduleId),
      name: DAMAGE_CATEGORY_NAME,
      shorty: `damage_${shortSuffix}`,
      description: DAMAGE_CATEGORY_DESCRIPTION,
      data: null,
    };

    const created = await deps.apiClient.createDataCategory(deps.moduleId, payload);
    category = deps.mapToAssetType(created);

    await deps.recordChange({
      entityType: 'category',
      entityId: category.id,
      action: 'created',
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });
  }

  return category;
}

function mapToDamageReportRecord(value: unknown): DamageReportRecord {
  const raw = value as Record<string, unknown>;
  const dataStr = typeof raw['value'] === 'string' ? (raw['value'] as string) : (raw['data'] as string | undefined);
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : raw;

  const photosRaw = parsed['photos'] ?? parsed['photoHandles'] ?? [];
  const photoHandles = Array.isArray(photosRaw)
    ? (photosRaw as unknown[]).map((item) => String(item))
    : [];

  const createdAt = (parsed['createdAt'] as string | undefined) ?? new Date().toISOString();
  const updatedAt = (parsed['updatedAt'] as string | undefined) ?? createdAt;

  return {
    id: String(raw['id'] ?? parsed['id']),
    assetId: String(parsed['assetId']),
    description: String(parsed['description'] ?? ''),
    photoHandles,
    status: (parsed['status'] ?? parsed['repairStatus'] ?? 'broken') as DamageReportRecord['status'],
    reportedBy: String(parsed['reportedBy']),
    reportedByName: parsed['reportedByName'] ? String(parsed['reportedByName']) : undefined,
    reportedAt: String(parsed['reportedAt'] ?? createdAt),
    repairedBy: parsed['repairedBy'] ? String(parsed['repairedBy']) : undefined,
    repairedByName: parsed['repairedByName'] ? String(parsed['repairedByName']) : undefined,
    repairedAt: parsed['repairedAt'] ? String(parsed['repairedAt']) : undefined,
    repairNotes: parsed['repairNotes'] ? String(parsed['repairNotes']) : undefined,
    createdAt,
    updatedAt,
  };
}
