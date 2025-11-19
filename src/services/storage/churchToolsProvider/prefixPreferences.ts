import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type { ChangeHistoryEntry } from '../../../types/entities';

interface PrefixPreferenceDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
}

type PreferenceType = 'module' | 'person';

interface PreferenceCategory {
  id: string;
  name: string;
}

interface PreferenceRecord {
  id: string;
  entryType: PreferenceType;
  personId?: string;
  prefixId: string | null;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
}

const CATEGORY_NAME = '__PrefixPreferences__';
const CATEGORY_DESCRIPTION = 'System category storing module and personal prefix defaults';

async function resolvePreferenceCategory(deps: PrefixPreferenceDependencies): Promise<PreferenceCategory> {
  try {
    const categories = await deps.apiClient.getDataCategories(deps.moduleId);
    const match = (categories as Array<{ id: unknown; name?: unknown }>).find(
      (category) => String(category.name) === CATEGORY_NAME,
    );

    if (match && match.id !== undefined) {
      return { id: String(match.id), name: CATEGORY_NAME };
    }
  } catch {
    // ignore and attempt to create a new category
  }

  const user = await deps.apiClient.getCurrentUser();
  const created = await deps.apiClient.createDataCategory(deps.moduleId, {
    customModuleId: Number(deps.moduleId),
    name: CATEGORY_NAME,
    shorty: `prefixprefs_${Date.now().toString().slice(-4)}`,
    description: CATEGORY_DESCRIPTION,
    data: null,
  });

  await deps.recordChange({
    entityType: 'asset-prefix',
    entityId: String((created as { id?: unknown }).id ?? CATEGORY_NAME),
    entityName: CATEGORY_NAME,
    action: 'created',
    changedBy: user.id,
    changedByName: user.name,
  });

  return { id: String((created as { id?: unknown }).id ?? CATEGORY_NAME), name: CATEGORY_NAME };
}

function mapPreference(value: unknown): PreferenceRecord {
  const record = value as Record<string, unknown>;
  const dataStr = (record['value'] || record['data']) as string | null;
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : {};

  return {
    id: String(record['id'] ?? parsed['id'] ?? ''),
    entryType: (parsed['entryType'] as PreferenceType) ?? 'module',
    personId: parsed['personId'] ? String(parsed['personId']) : undefined,
    prefixId: parsed['prefixId'] ? String(parsed['prefixId']) : null,
    updatedAt: parsed['updatedAt'] ? String(parsed['updatedAt']) : undefined,
    updatedBy: parsed['updatedBy'] ? String(parsed['updatedBy']) : undefined,
    updatedByName: parsed['updatedByName'] ? String(parsed['updatedByName']) : undefined,
  };
}

async function getAllPreferences(
  deps: PrefixPreferenceDependencies,
  category: PreferenceCategory,
): Promise<PreferenceRecord[]> {
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  return values.map((value) => mapPreference(value));
}

async function upsertPreference(
  deps: PrefixPreferenceDependencies,
  category: PreferenceCategory,
  type: PreferenceType,
  prefixId: string | null,
  personId?: string,
): Promise<void> {
  const preferences = await getAllPreferences(deps, category);
  const existing = preferences.find((pref) =>
    type === 'module'
      ? pref.entryType === 'module'
      : pref.entryType === 'person' && pref.personId === personId,
  );

  if (!prefixId && existing) {
    await deps.apiClient.deleteDataValue(deps.moduleId, category.id, existing.id);
    return;
  }

  if (!prefixId && !existing) {
    return;
  }

  const user = await deps.apiClient.getCurrentUser();
  const payload = {
    entryType: type,
    personId: personId ?? null,
    prefixId,
    updatedAt: new Date().toISOString(),
    updatedBy: user.id,
    updatedByName: user.name,
  };

  if (existing) {
    const value = {
      id: Number(existing.id),
      dataCategoryId: Number(category.id),
      value: JSON.stringify(payload),
    };
    await deps.apiClient.updateDataValue(deps.moduleId, category.id, existing.id, value);
  } else {
    const value = {
      dataCategoryId: Number(category.id),
      value: JSON.stringify(payload),
    };
    await deps.apiClient.createDataValue(deps.moduleId, category.id, value);
  }

  await deps.recordChange({
    entityType: 'asset-prefix',
    entityId: type === 'module' ? 'module-default-prefix' : `person-default-prefix:${personId}`,
    action: 'updated',
    newValue: JSON.stringify({ prefixId, personId, type }),
    changedBy: user.id,
    changedByName: user.name,
  });
}

async function findPreference(
  deps: PrefixPreferenceDependencies,
  category: PreferenceCategory,
  type: PreferenceType,
  personId?: string,
): Promise<PreferenceRecord | undefined> {
  const preferences = await getAllPreferences(deps, category);
  if (type === 'module') {
    return preferences.find((pref) => pref.entryType === 'module');
  }
  return preferences.find((pref) => pref.entryType === 'person' && pref.personId === personId);
}

export async function getModuleDefaultPrefixId(deps: PrefixPreferenceDependencies): Promise<string | null> {
  const category = await resolvePreferenceCategory(deps);
  const pref = await findPreference(deps, category, 'module');
  return pref?.prefixId ?? null;
}

export async function setModuleDefaultPrefixId(
  deps: PrefixPreferenceDependencies,
  prefixId: string | null,
): Promise<void> {
  const category = await resolvePreferenceCategory(deps);
  await upsertPreference(deps, category, 'module', prefixId ?? null);
}

export async function getPersonDefaultPrefixId(
  deps: PrefixPreferenceDependencies,
  personId: string,
): Promise<string | null> {
  const category = await resolvePreferenceCategory(deps);
  const pref = await findPreference(deps, category, 'person', personId);
  return pref?.prefixId ?? null;
}

export async function setPersonDefaultPrefixId(
  deps: PrefixPreferenceDependencies,
  personId: string,
  prefixId: string | null,
): Promise<void> {
  const category = await resolvePreferenceCategory(deps);
  await upsertPreference(deps, category, 'person', prefixId ?? null, personId);
}
