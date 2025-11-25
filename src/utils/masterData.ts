import type { Asset } from '../types/entities';

export type MasterDataEntity = 'locations' | 'manufacturers' | 'models' | 'maintenanceCompanies';

export interface MasterDataItem {
  id: string;
  name: string;
  assetCount?: number;
}

export interface MasterDataDefinition {
  entity: MasterDataEntity;
  storageKey: string;
  eventName: string;
  idPrefix: string;
  assetField?: 'location' | 'manufacturer' | 'model';
}

export const MASTER_DATA_DEFINITIONS: Record<MasterDataEntity, MasterDataDefinition> = {
  locations: {
    entity: 'locations',
    storageKey: 'assetLocations',
    eventName: 'assetLocationsChanged',
    idPrefix: 'loc',
    assetField: 'location',
  },
  manufacturers: {
    entity: 'manufacturers',
    storageKey: 'assetManufacturers',
    eventName: 'assetManufacturersChanged',
    idPrefix: 'man',
    assetField: 'manufacturer',
  },
  models: {
    entity: 'models',
    storageKey: 'assetModels',
    eventName: 'assetModelsChanged',
    idPrefix: 'mod',
    assetField: 'model',
  },
  maintenanceCompanies: {
    entity: 'maintenanceCompanies',
    storageKey: 'maintenanceCompanies',
    eventName: 'maintenanceCompaniesChanged',
    idPrefix: 'mco',
  },
};

export function getMasterDataDefinition(entity: MasterDataEntity): MasterDataDefinition {
  return MASTER_DATA_DEFINITIONS[entity];
}

export function normalizeMasterDataName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

export function canonicalMasterDataName(name: string): string {
  return normalizeMasterDataName(name).toLowerCase();
}

export function generateMasterDataId(prefix: string): string {
  const cryptoRef = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return `${prefix}-${cryptoRef.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sortMasterDataItems(items: MasterDataItem[]): MasterDataItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function sortMasterDataNames(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function areMasterDataItemsEqual(a: MasterDataItem[], b: MasterDataItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((item, index) => item.id === b[index]?.id && item.name === b[index]?.name);
}

export function areMasterDataNamesEqual(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((name, index) => name === b[index]);
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

export function loadMasterData(definition: MasterDataDefinition): MasterDataItem[] {
  const storage = getStorage();
  if (!storage) return [];

  const raw = storage.getItem(definition.storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<string>();
    const items: MasterDataItem[] = [];

    parsed.forEach((entry, index) => {
      let name: string | null = null;
      let id: string | null = null;

      if (typeof entry === 'string') {
        name = entry;
      } else if (entry && typeof entry === 'object') {
        if ('name' in entry && typeof entry.name === 'string') {
          name = entry.name;
        }
        if ('id' in entry && typeof entry.id === 'string') {
          id = entry.id;
        }
      }

      if (!name) {
        return;
      }

      const normalized = normalizeMasterDataName(name);
      if (!normalized) {
        return;
      }

      const canonical = canonicalMasterDataName(normalized);
      if (seen.has(canonical)) {
        return;
      }

      seen.add(canonical);
      items.push({
        id: id ?? `${definition.idPrefix}-${index}`,
        name: normalized,
        assetCount: 0,
      });
    });

    return sortMasterDataItems(items);
  } catch (error) {
    console.warn(`Failed to load master data for ${definition.storageKey}`, error);
    return [];
  }
}

export function persistMasterData(definition: MasterDataDefinition, items: MasterDataItem[]): void {
  const storage = getStorage();
  if (!storage) return;

  const toSave = items.map(({ id, name }) => ({ id, name, assetCount: 0 }));
  storage.setItem(definition.storageKey, JSON.stringify(toSave));

  try {
    window.dispatchEvent(new CustomEvent(definition.eventName));
  } catch (error) {
    console.warn(`Failed to dispatch event ${definition.eventName}`, error);
  }
}

export function createMasterDataItem(name: string, definition: MasterDataDefinition): MasterDataItem {
  return {
    id: generateMasterDataId(definition.idPrefix),
    name: normalizeMasterDataName(name),
    assetCount: 0,
  };
}

export function mapMasterDataItemsToNames(items: MasterDataItem[]): string[] {
  return items.map((item) => item.name);
}

export function buildAssetCountLookup(assets: Asset[], field?: MasterDataDefinition['assetField']): Map<string, number> {
  const counts = new Map<string, number>();

  if (!field) {
    return counts;
  }

  assets.forEach((asset) => {
    const value = asset[field];
    if (!value) return;
    const canonical = canonicalMasterDataName(value);
    counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
  });

  return counts;
}
