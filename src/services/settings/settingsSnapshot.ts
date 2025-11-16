import type { SettingsSnapshot, SettingsMasterDataItem } from '../../types/settings';
import { settingsSnapshotSchema } from '../../schemas/settings';
import { MASTER_DATA_DEFINITIONS, persistMasterData, loadMasterData } from '../../utils/masterData';
import { loadScannerModels, saveScannerModels } from './scannerModels';
import { useFeatureSettingsStore } from '../../stores/featureSettingsStore';
import { getStoredModuleDefaultPrefixId, setStoredModuleDefaultPrefixId } from '../assets/autoNumbering';

const ASSET_PREFIX_STORAGE_KEY = 'assetNumberPrefix';
const DEFAULT_PREFIX = 'ASSET';
const DEFAULT_FEATURE_TOGGLES = Object.freeze({
  bookingsEnabled: false,
  kitsEnabled: false,
  maintenanceEnabled: false,
});

const MASTER_DATA_SEQUENCE: Array<keyof SettingsSnapshot['masterData']> = [
  'locations',
  'manufacturers',
  'models',
  'maintenanceCompanies',
];

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

function toMasterDataItems(items: SettingsMasterDataItem[]): SettingsMasterDataItem[] {
  return items.map((item) => ({ id: item.id, name: item.name.trim() }));
}

function persistMasterDataCollection(definitionKey: keyof typeof MASTER_DATA_DEFINITIONS, items: SettingsMasterDataItem[]): void {
  const definition = MASTER_DATA_DEFINITIONS[definitionKey];
  const normalized = toMasterDataItems(items).map((item) => ({ ...item, assetCount: 0 }));
  persistMasterData(definition, normalized);
}

export async function collectSettingsSnapshot(): Promise<SettingsSnapshot> {
  const storage = getLocalStorage();
  const featureState = useFeatureSettingsStore.getState();

  const masterData = MASTER_DATA_SEQUENCE.reduce<SettingsSnapshot['masterData']>((acc, key) => {
    const definition = MASTER_DATA_DEFINITIONS[key];
    const items = loadMasterData(definition).map((item) => ({ id: item.id, name: item.name }));
    return { ...acc, [key]: items };
  }, {
    locations: [],
    manufacturers: [],
    models: [],
    maintenanceCompanies: [],
  });

  const snapshot: SettingsSnapshot = {
    schemaVersion: '1.0',
    assetNumberPrefix: storage?.getItem(ASSET_PREFIX_STORAGE_KEY) ?? DEFAULT_PREFIX,
    moduleDefaultPrefixId: getStoredModuleDefaultPrefixId(),
    featureToggles: {
      bookingsEnabled: featureState.bookingsEnabled,
      kitsEnabled: featureState.kitsEnabled,
      maintenanceEnabled: featureState.maintenanceEnabled,
    },
    masterData,
    scannerModels: loadScannerModels(),
  };

  return validateSettingsSnapshot(snapshot);
}

export async function applySettingsSnapshot(snapshot: SettingsSnapshot): Promise<void> {
  const normalized = validateSettingsSnapshot(snapshot);
  const storage = getLocalStorage();

  if (storage) {
    storage.setItem(ASSET_PREFIX_STORAGE_KEY, normalized.assetNumberPrefix);
  }

  setStoredModuleDefaultPrefixId(normalized.moduleDefaultPrefixId);

  MASTER_DATA_SEQUENCE.forEach((key) => {
    persistMasterDataCollection(key, normalized.masterData[key]);
  });

  saveScannerModels(normalized.scannerModels);

  useFeatureSettingsStore.setState((state) => ({
    ...state,
    ...normalized.featureToggles,
  }));
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
