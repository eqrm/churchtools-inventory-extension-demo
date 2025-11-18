import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type {
  Asset,
  AssetType,
  AssetFilters,
  AssetStatus,
  Booking,
  BookingFilters,
  ChangeHistoryEntry,
  Kit,
  KitCompletenessStatus,
  KitCreate,
  KitInheritanceProperty,
  KitUpdate,
} from '../../../types/entities';
import { CURRENT_SCHEMA_VERSION } from '../../migrations/constants';

export type KitAvailabilityResult = {
  available: boolean;
  unavailableAssets?: string[];
  reason?: string;
};

const INHERITABLE_PROPERTIES: KitInheritanceProperty[] = ['location', 'status', 'tags'];

function normalizeInheritedProperties(
  properties?: KitInheritanceProperty[] | null,
): KitInheritanceProperty[] {
  if (!properties?.length) {
    return [];
  }
  const unique = new Set<KitInheritanceProperty>();
  for (const property of properties) {
    if (INHERITABLE_PROPERTIES.includes(property)) {
      unique.add(property);
    }
  }
  return Array.from(unique);
}

function normalizeTags(raw?: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

function normalizeBoundAssetInheritance(boundAssets?: Kit['boundAssets'] | null): Kit['boundAssets'] | undefined {
  if (!boundAssets) {
    return boundAssets ?? undefined;
  }

  return boundAssets.map((asset) => {
    const inherits: Partial<Record<KitInheritanceProperty, boolean>> = {};
    for (const property of INHERITABLE_PROPERTIES) {
      const value = asset.inherits?.[property];
      if (typeof value === 'boolean') {
        inherits[property] = value;
      }
    }
    return {
      ...asset,
      inherits: Object.keys(inherits).length ? inherits : undefined,
    };
  });
}

export interface KitDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  getAllCategoriesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
  getAsset(id: string): Promise<Asset>;
  getAssets(filters?: AssetFilters): Promise<Asset[]>;
  isAssetAvailable(assetId: string, startDate: string, endDate: string): Promise<boolean>;
  getBookings(filters?: BookingFilters): Promise<Booking[]>;
}

export async function getKits(deps: KitDependencies): Promise<Kit[]> {
  try {
    const category = await getKitsCategory(deps);
    const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
    return values.map((record: unknown) => mapToKit(record));
  } catch (error) {
    console.error('Error fetching kits:', error);
    return [];
  }
}

export async function getKit(deps: KitDependencies, id: string): Promise<Kit | null> {
  try {
    const kits = await getKits(deps);
    return kits.find((kit) => kit.id === id) ?? null;
  } catch (error) {
    console.error('Error fetching kit:', error);
    return null;
  }
}

export async function createKit(deps: KitDependencies, data: KitCreate): Promise<Kit> {
  const category = await getKitsCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  if (data.type === 'fixed' && (!data.boundAssets || data.boundAssets.length === 0)) {
    throw new Error('Fixed kit must have at least one bound asset');
  }

  if (data.type === 'flexible' && (!data.poolRequirements || data.poolRequirements.length === 0)) {
    throw new Error('Flexible kit must have at least one pool requirement');
  }

  if (data.type === 'fixed' && data.boundAssets) {
    for (const boundAsset of data.boundAssets) {
      const asset = await deps.getAsset(boundAsset.assetId);
      if (!asset) {
        throw new Error(`Asset ${boundAsset.assetNumber} not found`);
      }
      if (asset.status !== 'available') {
        throw new Error(`Asset ${boundAsset.assetNumber} is not available (status: ${asset.status})`);
      }
    }
  }

  const now = new Date().toISOString();
  const inheritedProperties = normalizeInheritedProperties(data.inheritedProperties);
  const tags = normalizeTags(data.tags);
  const boundAssets = normalizeBoundAssetInheritance(data.boundAssets);
  const kitStatus: AssetStatus = data.status ?? 'available';
  const completeness: KitCompletenessStatus = data.completenessStatus ?? 'complete';

  const kitPayload = {
    ...data,
    location: data.location ?? null,
    status: kitStatus,
    tags,
    inheritedProperties,
    boundAssets,
    completenessStatus: completeness,
    assemblyDate: data.type === 'fixed' ? data.assemblyDate ?? now : data.assemblyDate,
    disassemblyDate: data.disassemblyDate ?? null,
    createdBy: user.id,
    createdByName: user.name,
    createdAt: now,
    lastModifiedBy: user.id,
    lastModifiedByName: user.name,
    lastModifiedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  } satisfies Record<string, unknown>;

  const valueData = {
    dataCategoryId: Number(category.id),
    value: JSON.stringify(kitPayload),
  };

  const created = await deps.apiClient.createDataValue(deps.moduleId, category.id, valueData);
  const kit = mapToKit(created);

  await deps.recordChange({
    entityType: 'kit',
    entityId: kit.id,
    entityName: kit.name,
    action: 'created',
    changedBy: user.id,
    changedByName: user.name,
  });

  return kit;
}

export async function updateKit(deps: KitDependencies, id: string, data: KitUpdate): Promise<Kit> {
  const existing = await getKit(deps, id);
  if (!existing) {
    throw new Error(`Kit ${id} not found`);
  }

  const category = await getKitsCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  if (data.boundAssets && data.boundAssets.length > 0) {
    for (const boundAsset of data.boundAssets) {
      const asset = await deps.getAsset(boundAsset.assetId);
      if (!asset) {
        throw new Error(`Asset ${boundAsset.assetNumber} not found`);
      }
    }
  }

  const now = new Date().toISOString();
  const inheritedProperties =
    data.inheritedProperties !== undefined
      ? normalizeInheritedProperties(data.inheritedProperties)
      : normalizeInheritedProperties(existing.inheritedProperties);
  const tags = data.tags !== undefined ? normalizeTags(data.tags) : normalizeTags(existing.tags);
  const boundAssets =
    data.boundAssets !== undefined
      ? normalizeBoundAssetInheritance(data.boundAssets)
      : normalizeBoundAssetInheritance(existing.boundAssets);
  const kitStatus: AssetStatus = data.status ?? existing.status ?? 'available';
  const completeness: KitCompletenessStatus =
    data.completenessStatus ?? existing.completenessStatus ?? 'complete';
  const location = data.location ?? existing.location ?? null;
  const assemblyDate = existing.assemblyDate ?? (existing.type === 'fixed' ? existing.createdAt : undefined);
  const disassemblyDate =
    data.disassemblyDate !== undefined ? data.disassemblyDate ?? null : existing.disassemblyDate ?? null;

  const updatedPayload = {
    ...existing,
    ...data,
    location,
    status: kitStatus,
    tags,
    inheritedProperties,
    boundAssets,
    completenessStatus: completeness,
    assemblyDate,
    disassemblyDate,
    lastModifiedBy: user.id,
    lastModifiedByName: user.name,
    lastModifiedAt: now,
    schemaVersion: existing.schemaVersion ?? CURRENT_SCHEMA_VERSION,
  } satisfies Record<string, unknown>;

  const valueData = {
    id: Number(id),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(updatedPayload),
  };

  const updated = await deps.apiClient.updateDataValue(deps.moduleId, category.id, id, valueData);
  const kit = mapToKit(updated);

  await deps.recordChange({
    entityType: 'kit',
    entityId: kit.id,
    entityName: kit.name,
    action: 'updated',
    changedBy: user.id,
    changedByName: user.name,
  });

  return kit;
}

export async function deleteKit(deps: KitDependencies, id: string): Promise<void> {
  const kit = await getKit(deps, id);
  if (!kit) {
    throw new Error(`Kit ${id} not found`);
  }

  const activeStatuses: Booking['status'][] = ['pending', 'approved', 'active'];
  const bookings = await deps.getBookings({ kitId: id, status: activeStatuses });
  if (bookings.length > 0) {
    throw new Error(`Cannot delete kit with active bookings (${bookings.length} bookings found)`);
  }

  const category = await getKitsCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  await deps.apiClient.deleteDataValue(deps.moduleId, category.id, id);

  await deps.recordChange({
    entityType: 'kit',
    entityId: id,
    entityName: kit.name,
    action: 'deleted',
    changedBy: user.id,
    changedByName: user.name,
  });
}

export async function isKitAvailable(
  deps: KitDependencies,
  kitId: string,
  startDate: string,
  endDate: string,
): Promise<KitAvailabilityResult> {
  const kit = await getKit(deps, kitId);
  if (!kit) {
    return { available: false, reason: 'Kit not found' };
  }

  if (kit.type === 'fixed') {
    return checkFixedKitAvailability(deps, kit, startDate, endDate);
  }

  return checkFlexibleKitAvailability(deps, kit, startDate, endDate);
}

async function getKitsCategory(deps: KitDependencies): Promise<AssetType> {
  const categories = await deps.getAllCategoriesIncludingHistory();
  let kitsCategory = categories.find((category) => category.name === '__kits__');

  if (!kitsCategory) {
    const user = await deps.apiClient.getCurrentUser();
    const shorty = 'kits_' + Date.now().toString().substring(-4);

    const payload = {
      customModuleId: Number(deps.moduleId),
      name: '__kits__',
      shorty,
      description: 'Internal category for equipment kits',
      data: null,
    };

    const created = await deps.apiClient.createDataCategory(deps.moduleId, payload);
    kitsCategory = deps.mapToAssetType(created);

    await deps.recordChange({
      entityType: 'category',
      entityId: kitsCategory.id,
      entityName: kitsCategory.name,
      action: 'created',
      changedBy: user.id,
      changedByName: user.name,
    });
  }

  return kitsCategory;
}

function mapToKit(value: unknown): Kit {
  const raw = value as Record<string, unknown>;
  const dataStr = (raw['value'] || raw['data']) as string | null;

  if (!dataStr) {
    throw new Error('Invalid kit data: missing value field');
  }

  const data = JSON.parse(dataStr) as Record<string, unknown>;

  return {
    id: String(raw['id']),
    name: String(data['name']),
    description: data['description'] ? String(data['description']) : undefined,
    type: data['type'] as Kit['type'],
    location: (data['location'] as string) ?? undefined,
    status: (data['status'] as AssetStatus) ?? 'available',
    tags: normalizeTags(data['tags']),
    inheritedProperties: normalizeInheritedProperties(
      data['inheritedProperties'] as KitInheritanceProperty[] | null | undefined,
    ),
    completenessStatus: (data['completenessStatus'] as KitCompletenessStatus) ?? 'complete',
    assemblyDate: data['assemblyDate'] as string | undefined,
    disassemblyDate: (data['disassemblyDate'] as string | null) ?? null,
  boundAssets: normalizeBoundAssetInheritance(data['boundAssets'] as Kit['boundAssets']),
    poolRequirements: data['poolRequirements'] as Kit['poolRequirements'],
    createdBy: String(data['createdBy']),
    createdByName: String(data['createdByName']),
    createdAt: (data['createdAt'] as string) ?? (raw['created_at'] as string) ?? new Date().toISOString(),
    lastModifiedBy: String(data['lastModifiedBy']),
    lastModifiedByName: String(data['lastModifiedByName']),
    lastModifiedAt:
      (data['lastModifiedAt'] as string) ?? (raw['modified_at'] as string) ?? new Date().toISOString(),
    schemaVersion: data['schemaVersion'] as string | undefined,
  } as Kit;
}

async function checkFixedKitAvailability(
  deps: KitDependencies,
  kit: Kit,
  startDate: string,
  endDate: string,
): Promise<KitAvailabilityResult> {
  if (!kit.boundAssets || kit.boundAssets.length === 0) {
    return { available: false, reason: 'Fixed kit has no bound assets' };
  }

  const unavailableAssets: string[] = [];

  for (const boundAsset of kit.boundAssets) {
    const isAvailable = await deps.isAssetAvailable(boundAsset.assetId, startDate, endDate);
    if (!isAvailable) {
      unavailableAssets.push(boundAsset.assetId);
    }
  }

  if (unavailableAssets.length > 0) {
    return {
      available: false,
      unavailableAssets,
      reason: `${unavailableAssets.length} asset(s) unavailable`,
    };
  }

  return { available: true };
}

async function checkFlexibleKitAvailability(
  deps: KitDependencies,
  kit: Kit,
  startDate: string,
  endDate: string,
): Promise<KitAvailabilityResult> {
  if (!kit.poolRequirements || kit.poolRequirements.length === 0) {
    return { available: false, reason: 'Flexible kit has no pool requirements' };
  }

  for (const pool of kit.poolRequirements) {
  const assets = await deps.getAssets({ assetTypeId: pool.assetTypeId });

    let filteredAssets = assets;
    if (pool.filters) {
      filteredAssets = assets.filter((asset) => {
        for (const [key, value] of Object.entries(pool.filters ?? {})) {
          if (asset.customFieldValues[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    let availableCount = 0;
    for (const asset of filteredAssets) {
      const isAvailable = await deps.isAssetAvailable(asset.id, startDate, endDate);
      if (isAvailable) {
        availableCount += 1;
      }
    }

    if (availableCount < pool.quantity) {
      return {
        available: false,
  reason: `Insufficient assets in pool ${pool.assetTypeName}: need ${pool.quantity}, only ${availableCount} available`,
      };
    }
  }

  return { available: true };
}
