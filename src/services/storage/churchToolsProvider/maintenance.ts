import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type {
  Asset,
  AssetType,
  ChangeHistoryEntry,
  MaintenanceCalendarHold,
  MaintenanceRecord,
  MaintenanceRecordCreate,
  MaintenanceSchedule,
  MaintenanceScheduleCreate,
} from '../../../types/entities';
import type { MaintenanceRule, WorkOrder } from '../../../types/maintenance';
import { CURRENT_SCHEMA_VERSION } from '../../migrations/constants';

export interface MaintenanceDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  getAllCategoriesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
  getAsset(id: string): Promise<Asset>;
}

export async function getMaintenanceRecords(
  deps: MaintenanceDependencies,
  assetId?: string,
): Promise<MaintenanceRecord[]> {
  const category = await getMaintenanceRecordsCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  let records = values.map((val: unknown) => mapToMaintenanceRecord(val));

  if (assetId) {
    records = records.filter((record) => record.asset.id === assetId);
  }

  return records.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getMaintenanceRecord(
  deps: MaintenanceDependencies,
  id: string,
): Promise<MaintenanceRecord | null> {
  const records = await getMaintenanceRecords(deps);
  return records.find((record) => record.id === id) ?? null;
}

export async function createMaintenanceRecord(
  deps: MaintenanceDependencies,
  recordData: MaintenanceRecordCreate,
): Promise<MaintenanceRecord> {
  try {
    const category = await getMaintenanceRecordsCategory(deps);
    const user = await deps.apiClient.getCurrentUser();

    const payload = {
      ...recordData,
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    const valueData = {
      dataCategoryId: Number(category.id),
      value: JSON.stringify(payload),
    };

    const created = await deps.apiClient.createDataValue(
      deps.moduleId,
      category.id,
      valueData,
    );

    const record = mapToMaintenanceRecord(created);

    await deps.recordChange({
      entityType: 'maintenance',
      entityId: record.id,
      action: 'created',
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });

    return record;
  } catch (error) {
    console.error('[Maintenance] Failed to create maintenance record:', error);
    if (error instanceof Error) {
      throw new Error(`Could not create maintenance record: ${error.message}`);
    }
    throw new Error('Could not create maintenance record: Unknown error occurred');
  }
}

export async function updateMaintenanceRecord(
  deps: MaintenanceDependencies,
  id: string,
  updates: Partial<MaintenanceRecord>,
): Promise<MaintenanceRecord> {
  const existing = await getMaintenanceRecord(deps, id);
  if (!existing) {
    throw new Error(`Maintenance record ${id} not found`);
  }

  const category = await getMaintenanceRecordsCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  const updatedPayload = {
    ...existing,
    ...updates,
    lastModifiedAt: new Date().toISOString(),
    schemaVersion: existing.schemaVersion ?? CURRENT_SCHEMA_VERSION,
  };

  const valueData = {
    id: Number(id),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(updatedPayload),
  };

  const updated = await deps.apiClient.updateDataValue(
    deps.moduleId,
    category.id,
    id,
    valueData,
  );

  const record = mapToMaintenanceRecord(updated);

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: id,
    action: 'updated',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return record;
}

export async function deleteMaintenanceRecord(
  deps: MaintenanceDependencies,
  id: string,
): Promise<void> {
  const existing = await getMaintenanceRecord(deps, id);
  if (!existing) {
    return;
  }

  const category = await getMaintenanceRecordsCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  try {
    await deps.apiClient.deleteDataValue(deps.moduleId, category.id, id);
  } catch (error) {
    console.error('[Maintenance] Failed to delete maintenance record:', error);
    throw error;
  }

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: id,
    action: 'deleted',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

// ============================================================================
// Maintenance Rules CRUD
// ============================================================================

async function getMaintenanceRulesCategory(deps: MaintenanceDependencies): Promise<AssetType> {
  const categories = await deps.getAllCategoriesIncludingHistory();
  let category = categories.find((cat) => cat.name === '__MaintenanceRules__');

  if (!category) {
    const shorty = `maint_rules_${Date.now().toString().slice(-4)}`;
    const payload = {
      customModuleId: Number(deps.moduleId),
      name: '__MaintenanceRules__',
      shorty,
      description: 'Maintenance rules for automated scheduling',
      data: null,
    };
    const created = await deps.apiClient.createDataCategory(deps.moduleId, payload);
    category = deps.mapToAssetType(created);
  }

  return category;
}

export async function getMaintenanceRules(
  deps: MaintenanceDependencies,
): Promise<MaintenanceRule[]> {
  const category = await getMaintenanceRulesCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  return values.map((val: unknown) => mapToMaintenanceRule(val));
}

export async function getMaintenanceRule(
  deps: MaintenanceDependencies,
  id: string,
): Promise<MaintenanceRule | null> {
  const rules = await getMaintenanceRules(deps);
  return rules.find((rule) => rule.id === id) ?? null;
}

export async function createMaintenanceRule(
  deps: MaintenanceDependencies,
  ruleData: MaintenanceRule,
): Promise<MaintenanceRule> {
  try {
    const category = await getMaintenanceRulesCategory(deps);
    const user = await deps.apiClient.getCurrentUser();

    const payload = {
      ...ruleData,
      createdAt: ruleData.createdAt || new Date().toISOString(),
      updatedAt: ruleData.updatedAt || new Date().toISOString(),
    };

    const valueData = {
      dataCategoryId: Number(category.id),
      value: JSON.stringify(payload),
    };

    const created = await deps.apiClient.createDataValue(
      deps.moduleId,
      category.id,
      valueData,
    );

    const rule = mapToMaintenanceRule(created);

    await deps.recordChange({
      entityType: 'maintenance',
      entityId: rule.id,
      action: 'created',
      newValue: `Rule: ${rule.name}`,
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });

    return rule;
  } catch (error) {
    console.error('[Maintenance] Failed to create maintenance rule:', error);
    if (error instanceof Error) {
      throw new Error(`Could not create maintenance rule: ${error.message}`);
    }
    throw new Error('Could not create maintenance rule: Unknown error occurred');
  }
}

export async function updateMaintenanceRule(
  deps: MaintenanceDependencies,
  id: string,
  updates: MaintenanceRule,
): Promise<MaintenanceRule> {
  const existing = await getMaintenanceRule(deps, id);
  if (!existing) {
    throw new Error(`Maintenance rule ${id} not found`);
  }

  const category = await getMaintenanceRulesCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  const updated = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    createdBy: existing.createdBy,
    updatedAt: new Date().toISOString(),
  };

  const payload = {
    id: Number(id),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(updated),
  };

  const result = await deps.apiClient.updateDataValue(
    deps.moduleId,
    category.id,
    id,
    payload,
  );

  const updatedRule = mapToMaintenanceRule(result);

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: id,
    action: 'updated',
    oldValue: `Rule: ${existing.name}`,
    newValue: `Rule: ${updatedRule.name}`,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return updatedRule;
}

export async function deleteMaintenanceRule(
  deps: MaintenanceDependencies,
  id: string,
): Promise<void> {
  const existing = await getMaintenanceRule(deps, id);
  if (!existing) {
    return;
  }

  const category = await getMaintenanceRulesCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  try {
    await deps.apiClient.deleteDataValue(deps.moduleId, category.id, id);
  } catch (error) {
    console.error('[Maintenance] Failed to delete maintenance rule:', error);
    throw error;
  }

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: id,
    action: 'deleted',
    oldValue: `Rule: ${existing.name}`,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

export async function getMaintenanceSchedules(
  deps: MaintenanceDependencies,
  assetId?: string,
): Promise<MaintenanceSchedule[]> {
  const category = await getMaintenanceSchedulesCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  let schedules = values.map((val: unknown) => mapToMaintenanceSchedule(val));

  if (assetId) {
    schedules = schedules.filter((schedule) => schedule.assetId === assetId);
  }

  return schedules;
}

export async function getMaintenanceSchedule(
  deps: MaintenanceDependencies,
  assetId: string,
): Promise<MaintenanceSchedule | null> {
  const schedules = await getMaintenanceSchedules(deps, assetId);
  return schedules[0] ?? null;
}

export async function createMaintenanceSchedule(
  deps: MaintenanceDependencies,
  scheduleData: MaintenanceScheduleCreate,
): Promise<MaintenanceSchedule> {
  const category = await getMaintenanceSchedulesCategory(deps);
  const user = await deps.apiClient.getCurrentUser();
  const now = new Date().toISOString();

  const payload = {
    ...scheduleData,
    createdAt: now,
    lastModifiedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  const valueData = {
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  };

  const created = await deps.apiClient.createDataValue(
    deps.moduleId,
    category.id,
    valueData,
  );

  const schedule = mapToMaintenanceSchedule(created);

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: schedule.id,
    action: 'created',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return schedule;
}

export async function updateMaintenanceSchedule(
  deps: MaintenanceDependencies,
  id: string,
  updates: Partial<MaintenanceSchedule>,
): Promise<MaintenanceSchedule> {
  const schedules = await getMaintenanceSchedules(deps);
  const existing = schedules.find((schedule) => schedule.id === id);

  if (!existing) {
    throw new Error(`Maintenance schedule ${id} not found`);
  }

  const category = await getMaintenanceSchedulesCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  const updatedPayload = {
    ...existing,
    ...updates,
    lastModifiedAt: new Date().toISOString(),
    schemaVersion: existing.schemaVersion ?? CURRENT_SCHEMA_VERSION,
  };

  const valueData = {
    id: Number(id),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(updatedPayload),
  };

  const updated = await deps.apiClient.updateDataValue(
    deps.moduleId,
    category.id,
    id,
    valueData,
  );

  const schedule = mapToMaintenanceSchedule(updated);

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: id,
    action: 'updated',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return schedule;
}

export async function deleteMaintenanceSchedule(
  deps: MaintenanceDependencies,
  id: string,
): Promise<void> {
  const category = await getMaintenanceSchedulesCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  await deps.apiClient.deleteDataValue(deps.moduleId, category.id, id);

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: id,
    action: 'deleted',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

export async function getOverdueMaintenanceSchedules(
  deps: MaintenanceDependencies,
): Promise<MaintenanceSchedule[]> {
  const schedules = await getMaintenanceSchedules(deps);
  const today = new Date().toISOString().split('T')[0] as string;

  return schedules.filter(
    (schedule) => schedule.nextDue !== undefined && schedule.nextDue < today,
  );
}

export async function getOverdueMaintenance(
  deps: MaintenanceDependencies,
): Promise<Asset[]> {
  const overdueSchedules = await getOverdueMaintenanceSchedules(deps);
  const assetIds = new Set(overdueSchedules.map((schedule) => schedule.assetId));

  const assets: Asset[] = [];
  for (const assetId of assetIds) {
    try {
      const asset = await deps.getAsset(assetId);
      if (asset) {
        assets.push(asset);
      }
    } catch (error) {
      console.warn(`Asset ${assetId} not found while resolving overdue maintenance`, error);
    }
  }

  return assets;
}

export async function getUpcomingMaintenance(
  deps: MaintenanceDependencies,
  daysAhead: number,
): Promise<Asset[]> {
  const schedules = await getMaintenanceSchedules(deps);
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const todayStr = today.toISOString().split('T')[0] as string;
  const futureDateStr = futureDate.toISOString().split('T')[0] as string;

  const upcoming = schedules.filter(
    (schedule) =>
      schedule.nextDue !== undefined &&
      schedule.nextDue >= todayStr &&
      schedule.nextDue <= futureDateStr,
  );

  const assetIds = new Set(upcoming.map((schedule) => schedule.assetId));
  const assets: Asset[] = [];

  for (const assetId of assetIds) {
    try {
      const asset = await deps.getAsset(assetId);
      if (asset) {
        assets.push(asset);
      }
    } catch (error) {
      console.warn(`Asset ${assetId} not found while resolving upcoming maintenance`, error);
    }
  }

  return assets;
}

export async function getMaintenanceHolds(
  deps: MaintenanceDependencies,
  filters?: {
    planId?: string;
    assetId?: string;
    status?: 'active' | 'released';
  },
): Promise<MaintenanceCalendarHold[]> {
  const category = await getMaintenanceHoldsCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  let holds = values.map((entry: unknown) => mapToMaintenanceHold(entry));

  if (filters?.planId) {
    holds = holds.filter((hold) => hold.planId === filters.planId);
  }

  if (filters?.assetId) {
    holds = holds.filter((hold) => hold.assetId === filters.assetId);
  }

  if (filters?.status) {
    holds = holds.filter((hold) => hold.status === filters.status);
  }

  return holds.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function createMaintenanceHold(
  deps: MaintenanceDependencies,
  hold: Omit<MaintenanceCalendarHold, 'id' | 'status' | 'createdAt' | 'releasedAt'> & {
    status?: 'active' | 'released';
  },
): Promise<MaintenanceCalendarHold> {
  const category = await getMaintenanceHoldsCategory(deps);
  const user = await deps.apiClient.getCurrentUser();
  const now = new Date().toISOString();

  const payload = {
    ...hold,
    status: hold.status ?? 'active',
    createdAt: now,
    releasedAt: hold.status === 'released' ? now : undefined,
  };

  const valueData = {
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  };

  const created = await deps.apiClient.createDataValue(
    deps.moduleId,
    category.id,
    valueData,
  );

  const result = mapToMaintenanceHold(created);

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: result.planId,
    entityName: result.assetId,
    action: 'created',
    changes: [
      {
        field: 'maintenanceHold',
        oldValue: 'none',
        newValue: `${result.assetId}:${result.startDate}-${result.endDate}`,
      },
    ],
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return result;
}

export async function releaseMaintenanceHold(
  deps: MaintenanceDependencies,
  holdId: string,
  updates?: Partial<
    Omit<
      MaintenanceCalendarHold,
      'id' | 'planId' | 'assetId' | 'startDate' | 'endDate' | 'createdAt'
    >
  >,
): Promise<MaintenanceCalendarHold> {
  const category = await getMaintenanceHoldsCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  const raw = values.find(
    (entry: unknown) => String((entry as Record<string, unknown>)['id']) === holdId,
  );

  if (!raw) {
    throw new Error(`Maintenance hold ${holdId} not found`);
  }

  const existing = mapToMaintenanceHold(raw);
  const user = await deps.apiClient.getCurrentUser();
  const releasedAt = updates?.releasedAt ?? new Date().toISOString();

  const payload = {
    ...existing,
    ...updates,
    status: 'released' as const,
    releasedAt,
  };

  const valueData = {
    id: Number(holdId),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  };

  const updated = await deps.apiClient.updateDataValue(
    deps.moduleId,
    category.id,
    holdId,
    valueData,
  );

  const result = mapToMaintenanceHold(updated);

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: result.planId,
    entityName: result.assetId,
    action: 'updated',
    changes: [
      {
        field: 'maintenanceHoldStatus',
        oldValue: existing.status,
        newValue: result.status,
      },
    ],
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return result;
}

async function getMaintenanceRecordsCategory(
  deps: MaintenanceDependencies,
): Promise<AssetType> {
  const categories = await deps.getAllCategoriesIncludingHistory();
  let category = categories.find((cat) => cat.name === '__MaintenanceRecords__');

  if (!category) {
    const user = await deps.apiClient.getCurrentUser();
    const shorty = 'maint_' + Date.now().toString().substring(-4);

    const payload = {
      customModuleId: Number(deps.moduleId),
      name: '__MaintenanceRecords__',
      shorty,
      description: 'Internal category for maintenance records',
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

async function getMaintenanceSchedulesCategory(
  deps: MaintenanceDependencies,
): Promise<AssetType> {
  const categories = await deps.getAllCategoriesIncludingHistory();
  let category = categories.find((cat) => cat.name === '__MaintenanceSchedules__');

  if (!category) {
    const user = await deps.apiClient.getCurrentUser();
    const shorty = 'sched_' + Date.now().toString().substring(-4);

    const payload = {
      customModuleId: Number(deps.moduleId),
      name: '__MaintenanceSchedules__',
      shorty,
      description: 'Internal category for maintenance schedules',
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

async function getMaintenanceHoldsCategory(
  deps: MaintenanceDependencies,
): Promise<AssetType> {
  const categories = await deps.getAllCategoriesIncludingHistory();
  let category = categories.find((cat) => cat.name === '__MaintenanceHolds__');

  if (!category) {
    const user = await deps.apiClient.getCurrentUser();
    const shorty = 'mhold_' + Date.now().toString().substring(-4);

    const payload = {
      customModuleId: Number(deps.moduleId),
      name: '__MaintenanceHolds__',
      shorty,
      description: 'Internal category for maintenance calendar holds',
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

function mapToMaintenanceRecord(val: unknown): MaintenanceRecord {
  const value = val as Record<string, unknown>;
  const dataStr = (value['value'] || value['data']) as string | null;
  const data = dataStr ? JSON.parse(dataStr) : value;

  return {
    id: String(value['id'] ?? data['id']),
    asset: data['asset'] as MaintenanceRecord['asset'],
    type: data['type'] as MaintenanceRecord['type'],
    date: data['date'] as string,
    performedBy: data['performedBy'] as string,
    performedByName: data['performedByName'] as string,
    description: data['description'] as string,
    notes: data['notes'] as string | undefined,
    cost: data['cost'] as number | undefined,
    photos: data['photos'] as string[] | undefined,
    documents: data['documents'] as string[] | undefined,
    bookingId: data['bookingId'] as string | undefined,
    nextDueDate: data['nextDueDate'] as string | undefined,
    createdAt: (data['createdAt'] as string) ?? new Date().toISOString(),
    lastModifiedAt: (data['lastModifiedAt'] as string) ?? new Date().toISOString(),
    schemaVersion: data['schemaVersion'] as string | undefined,
  } as MaintenanceRecord;
}

function mapToMaintenanceSchedule(val: unknown): MaintenanceSchedule {
  const raw = val as Record<string, unknown>;
  const parsed = typeof raw['value'] === 'string'
    ? (JSON.parse(raw['value'] as string) as Record<string, unknown>)
    : raw;

  return {
    id: String(raw['id'] ?? parsed['id']),
    assetId: String(parsed['assetId']),
    scheduleType: parsed['scheduleType'] as MaintenanceSchedule['scheduleType'],
    intervalDays: parsed['intervalDays'] as number | undefined,
    intervalMonths: parsed['intervalMonths'] as number | undefined,
    intervalYears: parsed['intervalYears'] as number | undefined,
    intervalHours: parsed['intervalHours'] as number | undefined,
    intervalBookings: parsed['intervalBookings'] as number | undefined,
    fixedDate: parsed['fixedDate'] as string | undefined,
    reminderDaysBefore: (parsed['reminderDaysBefore'] as number) ?? 0,
    lastPerformed: parsed['lastPerformed'] as string | undefined,
    nextDue: parsed['nextDue'] as string | undefined,
    isOverdue: parsed['isOverdue'] as boolean | undefined,
    createdAt:
      (parsed['createdAt'] as string) ?? (raw['created_at'] as string) ?? new Date().toISOString(),
    lastModifiedAt:
      (parsed['lastModifiedAt'] as string) ?? (raw['modified_at'] as string) ?? new Date().toISOString(),
    schemaVersion: parsed['schemaVersion'] as string | undefined,
  } as MaintenanceSchedule;
}

function mapToMaintenanceHold(val: unknown): MaintenanceCalendarHold {
  const raw = val as Record<string, unknown>;
  const dataStr = (raw['value'] || raw['data']) as string | null;
  const data = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : raw;

  const createdAt = (data['createdAt'] as string) ?? new Date().toISOString();
  const status = (data['status'] as 'active' | 'released') ?? 'active';

  return {
    id: String(raw['id'] ?? data['id']),
    planId: String(data['planId']),
    assetId: String(data['assetId']),
    startDate: String(data['startDate']),
    endDate: String(data['endDate']),
    bookingId: data['bookingId'] ? String(data['bookingId']) : undefined,
    holdColor: data['holdColor'] ? String(data['holdColor']) : undefined,
    status,
    createdAt,
    releasedAt: data['releasedAt'] ? String(data['releasedAt']) : undefined,
  };
}

function mapToMaintenanceRule(val: unknown): MaintenanceRule {
  const raw = val as Record<string, unknown>;
  const dataStr = (raw['value'] || raw['data']) as string | null;
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : raw;

  // Calculate nextDueDate if missing
  let nextDueDate = parsed['nextDueDate'] ? String(parsed['nextDueDate']) : '';
  if (!nextDueDate && parsed['startDate']) {
    const startDate = new Date(String(parsed['startDate']));
    const intervalType = parsed['intervalType'] as string;
    const intervalValue = Number(parsed['intervalValue'] ?? 0);
    
    if (intervalType === 'months') {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + intervalValue);
      nextDueDate = dueDate.toISOString().split('T')[0] as string;
    } else {
      nextDueDate = String(parsed['startDate']);
    }
  }

  return {
    id: String(raw['id'] ?? parsed['id']),
    name: String(parsed['name']),
    workType: String(parsed['workType']),
    isInternal: Boolean(parsed['isInternal']),
    serviceProviderId: parsed['serviceProviderId'] ? String(parsed['serviceProviderId']) : undefined,
    targets: (parsed['targets'] as MaintenanceRule['targets']) ?? [],
    intervalType: (parsed['intervalType'] as MaintenanceRule['intervalType']) ?? 'months',
    intervalValue: Number(parsed['intervalValue'] ?? 0),
    startDate: String(parsed['startDate']),
    nextDueDate,
    leadTimeDays: Number(parsed['leadTimeDays'] ?? 0),
    createdBy: String(parsed['createdBy']),
    createdByName: parsed['createdByName'] ? String(parsed['createdByName']) : undefined,
    createdAt: String(parsed['createdAt'] ?? new Date().toISOString()),
    updatedAt: String(parsed['updatedAt'] ?? new Date().toISOString()),
  };
}

// ============================================================================
// Work Orders CRUD (T4.1.5)
// ============================================================================

async function getWorkOrdersCategory(deps: MaintenanceDependencies): Promise<AssetType> {
  const categories = await deps.getAllCategoriesIncludingHistory();
  let category = categories.find((cat) => cat.name === '__WorkOrders__');

  if (!category) {
    const shorty = `work_orders_${Date.now().toString().slice(-4)}`;
    const payload = {
      customModuleId: Number(deps.moduleId),
      name: '__WorkOrders__',
      shorty,
      description: 'Work orders for maintenance tasks',
      data: null,
    };
    const created = await deps.apiClient.createDataCategory(deps.moduleId, payload);
    category = deps.mapToAssetType(created);
  }

  return category;
}

export async function getWorkOrders(
  deps: MaintenanceDependencies,
): Promise<WorkOrder[]> {
  const category = await getWorkOrdersCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  return values.map((val: unknown) => mapToWorkOrder(val));
}

export async function getWorkOrder(
  deps: MaintenanceDependencies,
  id: string,
): Promise<WorkOrder | null> {
  const workOrders = await getWorkOrders(deps);
  return workOrders.find((wo) => wo.id === id) ?? null;
}

export async function createWorkOrder(
  deps: MaintenanceDependencies,
  workOrderData: WorkOrder,
): Promise<WorkOrder> {
  try {
    const category = await getWorkOrdersCategory(deps);
    const user = await deps.apiClient.getCurrentUser();

    const payload = {
      ...workOrderData,
      createdAt: workOrderData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const valueData = {
      dataCategoryId: Number(category.id),
      value: JSON.stringify(payload),
    };

    const created = await deps.apiClient.createDataValue(
      deps.moduleId,
      category.id,
      valueData,
    );

    const workOrder = mapToWorkOrder(created);

    await deps.recordChange({
      entityType: 'maintenance',
      entityId: workOrder.id,
      action: 'created',
      newValue: `Work Order: ${workOrder.workOrderNumber}`,
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });

    return workOrder;
  } catch (error) {
    console.error('[Maintenance] Failed to create work order:', error);
    if (error instanceof Error) {
      throw new Error(`Could not create work order: ${error.message}`);
    }
    throw new Error('Could not create work order: Unknown error occurred');
  }
}

export async function updateWorkOrder(
  deps: MaintenanceDependencies,
  id: string,
  updates: WorkOrder,
): Promise<WorkOrder> {
  const existing = await getWorkOrder(deps, id);
  if (!existing) {
    throw new Error(`Work order ${id} not found`);
  }

  const category = await getWorkOrdersCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  const updated = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    createdBy: existing.createdBy,
    updatedAt: new Date().toISOString(),
  };

  const payload = {
    id: Number(id),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(updated),
  };

  const result = await deps.apiClient.updateDataValue(
    deps.moduleId,
    category.id,
    id,
    payload,
  );

  const updatedWorkOrder = mapToWorkOrder(result);

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: id,
    action: 'updated',
    oldValue: `Work Order: ${existing.workOrderNumber} (${existing.state})`,
    newValue: `Work Order: ${updatedWorkOrder.workOrderNumber} (${updatedWorkOrder.state})`,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return updatedWorkOrder;
}

export async function deleteWorkOrder(
  deps: MaintenanceDependencies,
  id: string,
): Promise<void> {
  const existing = await getWorkOrder(deps, id);
  if (!existing) {
    return;
  }

  const category = await getWorkOrdersCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  try {
    await deps.apiClient.deleteDataValue(deps.moduleId, category.id, id);
  } catch (error) {
    console.error('[Maintenance] Failed to delete work order:', error);
    throw error;
  }

  await deps.recordChange({
    entityType: 'maintenance',
    entityId: id,
    action: 'deleted',
    oldValue: `Work Order: ${existing.workOrderNumber}`,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

function mapToWorkOrder(val: unknown): WorkOrder {
  const raw = val as Record<string, unknown>;
  const dataStr = (raw['value'] || raw['data']) as string | null;
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : raw;

  return {
    id: String(raw['id'] ?? parsed['id']),
    workOrderNumber: String(parsed['workOrderNumber']),
    type: parsed['type'] as WorkOrder['type'],
    orderType: parsed['orderType'] as WorkOrder['orderType'],
    state: parsed['state'] as WorkOrder['state'],
    ruleId: parsed['ruleId'] ? String(parsed['ruleId']) : undefined,
    companyId: parsed['companyId'] ? String(parsed['companyId']) : undefined,
    assignedTo: parsed['assignedTo'] ? String(parsed['assignedTo']) : undefined,
    approvalResponsibleId: parsed['approvalResponsibleId'] ? String(parsed['approvalResponsibleId']) : undefined,
    leadTimeDays: Number(parsed['leadTimeDays'] ?? 0),
    scheduledStart: parsed['scheduledStart'] ? String(parsed['scheduledStart']) : undefined,
    scheduledEnd: parsed['scheduledEnd'] ? String(parsed['scheduledEnd']) : undefined,
    actualStart: parsed['actualStart'] ? String(parsed['actualStart']) : undefined,
    actualEnd: parsed['actualEnd'] ? String(parsed['actualEnd']) : undefined,
    offers: (parsed['offers'] as WorkOrder['offers']) ?? [],
    lineItems: (parsed['lineItems'] as WorkOrder['lineItems']) ?? [],
    history: (parsed['history'] as WorkOrder['history']) ?? [],
    createdBy: String(parsed['createdBy']),
    createdByName: parsed['createdByName'] ? String(parsed['createdByName']) : undefined,
    createdAt: String(parsed['createdAt'] ?? new Date().toISOString()),
    updatedAt: String(parsed['updatedAt'] ?? new Date().toISOString()),
  };
}
