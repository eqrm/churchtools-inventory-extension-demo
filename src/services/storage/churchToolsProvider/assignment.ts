import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type { AssignmentCreateInput, AssignmentRecord, AssignmentTargetType, AssignmentUpdateInput } from '../../../types/assignment';
import type { AssetType, ChangeHistoryEntry } from '../../../types/entities';
import { CURRENT_SCHEMA_VERSION } from '../../migrations/constants';

export interface AssignmentDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  getAllCategoriesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
}

const ASSIGNMENT_CATEGORY_NAME = '__Assignments__';
const ASSIGNMENT_CATEGORY_DESCRIPTION = 'Internal category for asset assignments';

export async function getAssignments(
  deps: AssignmentDependencies,
  assetId: string,
): Promise<AssignmentRecord[]> {
  const category = await getAssignmentsCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  const records = values.map((value) => mapToAssignmentRecord(value));

  return records
    .filter((record) => record.assetId === assetId)
    .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
}

export async function getAssignment(
  deps: AssignmentDependencies,
  assignmentId: string,
): Promise<AssignmentRecord | null> {
  const category = await getAssignmentsCategory(deps);
  try {
    // ChurchTools API doesn't support GET for individual custom data values
    // We need to fetch all assignments and filter by ID
    const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
    const record = values
      .map((value) => mapToAssignmentRecord(value))
      .find((r) => r.id === assignmentId);
    
    return record ?? null;
  } catch (error) {
    console.warn(`[Assignment] Failed to fetch assignment ${assignmentId}:`, error);
    return null;
  }
}

export async function createAssignment(
  deps: AssignmentDependencies,
  assetId: string,
  data: AssignmentCreateInput,
): Promise<AssignmentRecord> {
  const category = await getAssignmentsCategory(deps);
  const now = new Date().toISOString();
  const status = data.status ?? 'active';

  const payload = {
    assetId,
    target: data.target,
    status,
    assignedBy: data.assignedBy,
    assignedByName: data.assignedByName ?? null,
    assignedAt: data.assignedAt,
    dueAt: data.dueAt ?? null,
    notes: data.notes ?? null,
    checkedInAt: null,
    checkedInBy: null,
    checkedInByName: null,
    createdAt: now,
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  } satisfies Record<string, unknown>;

  const valueData = {
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  } satisfies Record<string, unknown>;

  const created = await deps.apiClient.createDataValue(
    deps.moduleId,
    category.id,
    valueData,
  );

  const record = mapToAssignmentRecord(created);

  return record;
}

export async function updateAssignment(
  deps: AssignmentDependencies,
  assignmentId: string,
  updates: AssignmentUpdateInput,
): Promise<AssignmentRecord> {
  const existing = await getAssignment(deps, assignmentId);
  if (!existing) {
    throw new Error(`Assignment ${assignmentId} not found`);
  }

  const category = await getAssignmentsCategory(deps);
  const now = new Date().toISOString();

  const merged = {
    assetId: existing.assetId,
    target: existing.target,
    status: updates.status ?? existing.status,
    assignedBy: existing.assignedBy,
    assignedByName: existing.assignedByName ?? null,
    assignedAt: existing.assignedAt,
    dueAt: normalizeNullable(updates.dueAt, existing.dueAt),
    notes: normalizeNullable(updates.notes, existing.notes),
    checkedInAt: normalizeNullable(updates.checkedInAt, existing.checkedInAt ?? undefined),
    checkedInBy: normalizeNullable(updates.checkedInBy, existing.checkedInBy ?? undefined),
    checkedInByName: normalizeNullable(updates.checkedInByName, existing.checkedInByName ?? undefined),
    createdAt: existing.createdAt,
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  } satisfies Record<string, unknown>;

  const valueData = {
    id: Number(assignmentId),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(merged),
  } satisfies Record<string, unknown>;

  const updated = await deps.apiClient.updateDataValue(
    deps.moduleId,
    category.id,
    assignmentId,
    valueData,
  );

  const record = mapToAssignmentRecord(updated);

  return record;
}

export async function deleteAssignment(
  deps: AssignmentDependencies,
  assignmentId: string,
): Promise<void> {
  const existing = await getAssignment(deps, assignmentId);
  if (!existing) {
    return;
  }

  const category = await getAssignmentsCategory(deps);
  await deps.apiClient.deleteDataValue(deps.moduleId, category.id, assignmentId);

}

export async function getAssignmentsForTarget(
  deps: AssignmentDependencies,
  targetId: string,
  targetType: AssignmentTargetType,
  options?: { includeReturned?: boolean },
): Promise<AssignmentRecord[]> {
  const category = await getAssignmentsCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  const records = values.map((value) => mapToAssignmentRecord(value));

  const filtered = records.filter((record) =>
    record.target.id === targetId && record.target.type === targetType,
  );

  const includeReturned = options?.includeReturned ?? false;
  return filtered.filter((record) => includeReturned || record.status === 'active');
}

async function getAssignmentsCategory(deps: AssignmentDependencies): Promise<AssetType> {
  const categories = await deps.getAllCategoriesIncludingHistory();
  let category = categories.find((cat) => cat.name === ASSIGNMENT_CATEGORY_NAME);

  if (!category) {
    const user = await deps.apiClient.getCurrentUser();
    const shortSuffix = Date.now().toString().slice(-4);
    const payload = {
      customModuleId: Number(deps.moduleId),
      name: ASSIGNMENT_CATEGORY_NAME,
      shorty: `assign_${shortSuffix}`,
      description: ASSIGNMENT_CATEGORY_DESCRIPTION,
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

function mapToAssignmentRecord(value: unknown): AssignmentRecord {
  const raw = value as Record<string, unknown>;
  const dataStr = typeof raw['value'] === 'string' ? (raw['value'] as string) : (raw['data'] as string | undefined);
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : raw;

  const targetRaw = parsed['target'] as Record<string, unknown> | undefined;
  const target = targetRaw
    ? {
        type: (targetRaw['type'] as AssignmentTargetType) ?? 'person',
        id: String(targetRaw['id'] ?? ''),
        name: String(targetRaw['name'] ?? ''),
      }
    : {
        type: 'person' as AssignmentTargetType,
        id: String(parsed['assignedTo'] ?? ''),
        name: String(parsed['assignedToName'] ?? 'Unknown'),
      };

  const status = (parsed['status'] ?? 'active') as AssignmentRecord['status'];

  return {
    id: String(raw['id'] ?? parsed['id']),
    assetId: String(parsed['assetId']),
    target,
    status,
    assignedBy: String(parsed['assignedBy']),
    assignedByName: parsed['assignedByName'] ? String(parsed['assignedByName']) : undefined,
    assignedAt: String(parsed['assignedAt']),
    dueAt: parsed['dueAt'] ? String(parsed['dueAt']) : undefined,
    checkedInAt: parsed['checkedInAt'] ? String(parsed['checkedInAt']) : undefined,
    checkedInBy: parsed['checkedInBy'] ? String(parsed['checkedInBy']) : undefined,
    checkedInByName: parsed['checkedInByName'] ? String(parsed['checkedInByName']) : undefined,
    notes: parsed['notes'] ? String(parsed['notes']) : undefined,
    createdAt: String(parsed['createdAt'] ?? new Date().toISOString()),
    updatedAt: String(parsed['updatedAt'] ?? new Date().toISOString()),
  };
}

function normalizeNullable<T>(updateValue: T | null | undefined, previous: T | null | undefined): T | null {
  if (updateValue === null) {
    return null;
  }
  if (typeof updateValue === 'undefined') {
    return previous ?? null;
  }
  return updateValue;
}
