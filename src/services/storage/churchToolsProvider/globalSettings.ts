import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type { ChangeHistoryEntry } from '../../../types/entities';

export interface GlobalSettingsDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
}

interface GlobalSettingRecord {
  id: string;
  key: string;
  value: unknown;
  updatedAt: string;
  updatedBy: string;
  updatedByName?: string;
}

const CATEGORY_NAME = '__GlobalSettings__';
const CATEGORY_DESCRIPTION = 'System category for global extension settings';

async function resolveCategory(deps: GlobalSettingsDependencies): Promise<{ id: string; name: string }> {
  try {
    const categories = await deps.apiClient.getDataCategories(deps.moduleId);
    const match = (categories as Array<{ id: unknown; name?: unknown }>).find(
      (category) => String(category.name) === CATEGORY_NAME,
    );

    if (match && match.id !== undefined) {
      return { id: String(match.id), name: CATEGORY_NAME };
    }
  } catch {
    // ignore
  }

  const user = await deps.apiClient.getCurrentUser();
  const created = await deps.apiClient.createDataCategory(deps.moduleId, {
    customModuleId: Number(deps.moduleId),
    name: CATEGORY_NAME,
    shorty: `settings_${Date.now().toString().slice(-4)}`,
    description: CATEGORY_DESCRIPTION,
    data: null,
  });

  await deps.recordChange({
    entityType: 'settings',
    entityId: String((created as { id?: unknown }).id ?? CATEGORY_NAME),
    entityName: CATEGORY_NAME,
    action: 'created',
    changedBy: user.id,
    changedByName: user.name,
  });

  return { id: String((created as { id?: unknown }).id ?? CATEGORY_NAME), name: CATEGORY_NAME };
}

function mapSetting(value: unknown): GlobalSettingRecord {
  const record = value as Record<string, unknown>;
  const dataStr = (record['value'] || record['data']) as string | null;
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : {};

  return {
    id: String(record['id'] ?? parsed['id'] ?? ''),
    key: String(parsed['key'] ?? ''),
    value: parsed['value'],
    updatedAt: String(parsed['updatedAt'] ?? ''),
    updatedBy: String(parsed['updatedBy'] ?? ''),
    updatedByName: parsed['updatedByName'] ? String(parsed['updatedByName']) : undefined,
  };
}

export async function getGlobalSetting<T>(deps: GlobalSettingsDependencies, key: string): Promise<T | null> {
  const category = await resolveCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  const settings = values.map(mapSetting);
  const setting = settings.find((s) => s.key === key);
  return setting ? (setting.value as T) : null;
}

export async function setGlobalSetting(deps: GlobalSettingsDependencies, key: string, value: unknown): Promise<void> {
  const category = await resolveCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  const settings = values.map(mapSetting);
  const existing = settings.find((s) => s.key === key);

  const user = await deps.apiClient.getCurrentUser();
  const now = new Date().toISOString();

  const payload = {
    key,
    value,
    updatedAt: now,
    updatedBy: user.id,
    updatedByName: user.name,
  };

  if (existing) {
    const dataValue = {
      id: Number(existing.id),
      dataCategoryId: Number(category.id),
      value: JSON.stringify(payload),
    };
    await deps.apiClient.updateDataValue(deps.moduleId, category.id, existing.id, dataValue);
  } else {
    const dataValue = {
      dataCategoryId: Number(category.id),
      value: JSON.stringify(payload),
    };
    await deps.apiClient.createDataValue(deps.moduleId, category.id, dataValue);
  }

  await deps.recordChange({
    entityType: 'settings',
    entityId: key,
    action: 'updated',
    newValue: JSON.stringify(value),
    changedBy: user.id,
    changedByName: user.name,
  });
}
