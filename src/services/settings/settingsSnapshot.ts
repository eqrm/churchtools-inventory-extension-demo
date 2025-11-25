import type { SettingsSnapshot, SettingsMasterDataItem, SettingsMasterDataSnapshot } from '../../types/settings';
import { settingsSnapshotSchema } from '../../schemas/settings';
import { MASTER_DATA_DEFINITIONS, canonicalMasterDataName, normalizeMasterDataName } from '../../utils/masterData';
import { loadScannerModelsAsync, saveScannerModelsAsync } from './scannerModels';
import { useFeatureSettingsStore } from '../../stores/featureSettingsStore';
import { getStoredModuleDefaultPrefixId, setStoredModuleDefaultPrefixId } from '../assets/autoNumbering';
import { masterDataService } from '../MasterDataService';
import { getChurchToolsStorageProvider } from '../churchTools/storageProvider';

const ASSET_PREFIX_STORAGE_KEY = 'assetNumberPrefix';
const DEFAULT_PREFIX = 'ASSET';
const DEFAULT_FEATURE_TOGGLES = Object.freeze({
  bookingsEnabled: false,
  kitsEnabled: true,
  maintenanceEnabled: false,
});

type MasterDataKey = keyof SettingsSnapshot['masterData'];

const MASTER_DATA_CONFIG: Record<MasterDataKey, { allowDeletes: boolean }> = {
  locations: { allowDeletes: true },
  manufacturers: { allowDeletes: true },
  models: { allowDeletes: true },
  maintenanceCompanies: { allowDeletes: false },
};

const MASTER_DATA_SEQUENCE = Object.keys(MASTER_DATA_CONFIG) as MasterDataKey[];

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeSnapshotNames(items: SettingsMasterDataItem[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  items.forEach((item) => {
    const name = normalizeMasterDataName(item.name ?? '');
    if (!name) {
      return;
    }
    const canonical = canonicalMasterDataName(name);
    if (seen.has(canonical)) {
      return;
    }
    seen.add(canonical);
    normalized.push(name);
  });

  return normalized;
}

async function collectMasterDataSnapshot(): Promise<SettingsMasterDataSnapshot> {
  const base: SettingsMasterDataSnapshot = {
    locations: [],
    manufacturers: [],
    models: [],
    maintenanceCompanies: [],
  };

  const entries = await Promise.all(
    MASTER_DATA_SEQUENCE.map(async (key) => {
      const entity = MASTER_DATA_DEFINITIONS[key].entity;
      const items = await masterDataService
        .list(entity)
        .catch((error) => {
          console.warn(`Failed to collect master data for ${entity}`, error);
          return [];
        });
      return [key, items.map((item) => ({ id: item.id, name: item.name }))] as const;
    })
  );

  return entries.reduce((acc, [key, items]) => {
    acc[key] = items;
    return acc;
  }, base);
}

async function syncMasterDataCollections(masterData: SettingsMasterDataSnapshot): Promise<void> {
  for (const key of MASTER_DATA_SEQUENCE) {
    await syncMasterDataEntity(key, masterData[key]);
  }
}

async function syncMasterDataEntity(key: MasterDataKey, items: SettingsMasterDataItem[]): Promise<void> {
  const definition = MASTER_DATA_DEFINITIONS[key];
  const desiredNames = normalizeSnapshotNames(items);
  const existing = await masterDataService.list(definition.entity);
  const existingByCanonical = new Map(existing.map((item) => [canonicalMasterDataName(item.name), item]));
  const desiredCanonical = new Set(desiredNames.map((name) => canonicalMasterDataName(name)));

  for (const name of desiredNames) {
    const canonical = canonicalMasterDataName(name);
    const existingItem = existingByCanonical.get(canonical);
    if (existingItem) {
      if (existingItem.name !== name) {
        await masterDataService.update(definition.entity, existingItem.id, name);
      }
    } else {
      await masterDataService.create(definition.entity, name);
    }
  }

  if (!MASTER_DATA_CONFIG[key].allowDeletes) {
    return;
  }

  for (const item of existing) {
    const canonical = canonicalMasterDataName(item.name);
    if (!desiredCanonical.has(canonical)) {
      await masterDataService.remove(definition.entity, item.id);
    }
  }
}

async function resolveModuleDefaultPrefixId(): Promise<string | null> {
  try {
    const provider = getChurchToolsStorageProvider();
    return await provider.getModuleDefaultPrefixId();
  } catch (error) {
    console.warn('Falling back to cached module default prefix id', error);
    return getStoredModuleDefaultPrefixId();
  }
}

async function applyModuleDefaultPrefix(prefixId: string | null): Promise<void> {
  try {
    const provider = getChurchToolsStorageProvider();
    await provider.setModuleDefaultPrefixId(prefixId);
  } catch (error) {
    console.warn('Failed to persist module default prefix to provider', error);
  }

  setStoredModuleDefaultPrefixId(prefixId);
}

export async function collectSettingsSnapshot(): Promise<SettingsSnapshot> {
  const storage = getLocalStorage();
  const featureState = useFeatureSettingsStore.getState();
  const masterData = await collectMasterDataSnapshot();
  const provider = getChurchToolsStorageProvider();

  let assetNumberPrefix = DEFAULT_PREFIX;
  try {
    const val = await provider.getGlobalSetting(ASSET_PREFIX_STORAGE_KEY);
    if (typeof val === 'string') {
      assetNumberPrefix = val;
    } else {
      assetNumberPrefix = storage?.getItem(ASSET_PREFIX_STORAGE_KEY) ?? DEFAULT_PREFIX;
    }
  } catch (e) {
    console.warn('Failed to fetch assetNumberPrefix from provider', e);
    assetNumberPrefix = storage?.getItem(ASSET_PREFIX_STORAGE_KEY) ?? DEFAULT_PREFIX;
  }

  const snapshot: SettingsSnapshot = {
    schemaVersion: '1.0',
    assetNumberPrefix,
    moduleDefaultPrefixId: await resolveModuleDefaultPrefixId(),
    featureToggles: {
      bookingsEnabled: featureState.bookingsEnabled,
      kitsEnabled: featureState.kitsEnabled,
      maintenanceEnabled: featureState.maintenanceEnabled,
    },
    masterData,
    scannerModels: await loadScannerModelsAsync(),
  };

  return validateSettingsSnapshot(snapshot);
}

export async function applySettingsSnapshot(snapshot: SettingsSnapshot, type: 'full' | 'scanner-only' = 'full'): Promise<void> {
  const normalized = validateSettingsSnapshot(snapshot);
  const provider = getChurchToolsStorageProvider();
  
  if (type === 'full') {
    const storage = getLocalStorage();

    try {
      await provider.setGlobalSetting(ASSET_PREFIX_STORAGE_KEY, normalized.assetNumberPrefix);
    } catch (e) {
      console.warn('Failed to save assetNumberPrefix to provider', e);
      if (storage) {
        storage.setItem(ASSET_PREFIX_STORAGE_KEY, normalized.assetNumberPrefix);
      }
    }

    await applyModuleDefaultPrefix(normalized.moduleDefaultPrefixId);

    await syncMasterDataCollections(normalized.masterData);

    useFeatureSettingsStore.setState((state) => ({
      ...state,
      ...normalized.featureToggles,
    }));
  }

  await saveScannerModelsAsync(normalized.scannerModels);
}

export function validateSettingsSnapshot(snapshot: unknown): SettingsSnapshot {
  const parsed = settingsSnapshotSchema.parse(snapshot);
  return {
    schemaVersion: parsed.schemaVersion ?? '1.0',
    assetNumberPrefix: parsed.assetNumberPrefix || DEFAULT_PREFIX,
    moduleDefaultPrefixId: parsed.moduleDefaultPrefixId ?? null,
    featureToggles: parsed.featureToggles ?? { ...DEFAULT_FEATURE_TOGGLES },
    masterData: {
      locations: parsed.masterData.locations ?? [],
      manufacturers: parsed.masterData.manufacturers ?? [],
      models: parsed.masterData.models ?? [],
      maintenanceCompanies: parsed.masterData.maintenanceCompanies ?? [],
    },
    scannerModels: parsed.scannerModels ?? [],
  };
}
