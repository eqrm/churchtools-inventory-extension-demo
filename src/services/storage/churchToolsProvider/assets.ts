import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type {
  Asset,
  AssetCreate,
  AssetFilters,
  AssetUpdate,
  AssetType,
  AssetPrefix,
  Booking,
  ChangeHistoryEntry,
} from '../../../types/entities';
import { EdgeCaseError } from '../../../types/edge-cases';
import { generateNextAssetNumber } from '../../../utils/assetNumbers';
import { CURRENT_SCHEMA_VERSION } from '../../migrations/constants';

export interface AssetDependencies {
  moduleId: string;
  globalPrefix: string;
  apiClient: ChurchToolsAPIClient;
  getAssetTypes(): Promise<AssetType[]>;
  getAssetType(id: string): Promise<AssetType>;
  getAssetPrefix(id: string): Promise<AssetPrefix>;
  incrementPrefixSequence(prefixId: string): Promise<number>;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
  valuesAreEqual(a: unknown, b: unknown): boolean;
  formatFieldValue(value: unknown): string;
  mapToAsset(data: unknown, assetType: AssetType): Asset;
  getBookingsForAsset(assetId: string, dateRange?: { start: string; end: string }): Promise<Booking[]>;
}

export async function getAssets(deps: AssetDependencies, filters?: AssetFilters): Promise<Asset[]> {
  const assetTypes = await deps.getAssetTypes();
  const allAssets: Asset[] = [];

  for (const assetType of assetTypes) {
    if (assetType.name.startsWith('__')) {
      continue;
    }

    const values = await deps.apiClient.getDataValues(deps.moduleId, assetType.id);
    const assets = values.map((value: unknown) => deps.mapToAsset(value, assetType));
    allAssets.push(...assets);
  }

  if (!filters) {
    return allAssets;
  }

  return applyAssetFilters(allAssets, filters);
}

export async function getAsset(deps: AssetDependencies, id: string): Promise<Asset> {
  const assets = await getAssets(deps);
  const asset = assets.find((entry) => entry.id === id);

  if (!asset) {
    throw new Error(`Asset with ID ${id} not found`);
  }

  return asset;
}

export async function getAssetByNumber(
  deps: AssetDependencies,
  assetNumber: string,
): Promise<Asset> {
  const assets = await getAssets(deps);
  const asset = assets.find((entry) => entry.assetNumber === assetNumber);

  if (!asset) {
    throw new Error(`Asset with number ${assetNumber} not found`);
  }

  return asset;
}

export async function createAsset(
  deps: AssetDependencies,
  data: AssetCreate,
): Promise<Asset> {
  const user = await deps.apiClient.getCurrentUser();
  const assetType = await deps.getAssetType(data.assetType.id);

  let assetNumber: string;

  if (data.prefixId) {
    const prefix = await deps.getAssetPrefix(data.prefixId);
    const sequence = await deps.incrementPrefixSequence(data.prefixId);
    assetNumber = `${prefix.prefix}-${sequence.toString().padStart(3, '0')}`;
  } else {
    const assets = await getAssets(deps);
    const existingNumbers = assets.map((asset) => asset.assetNumber.replace(`${deps.globalPrefix}-`, ''));
    const nextNumber = generateNextAssetNumber(existingNumbers);
    assetNumber = `${deps.globalPrefix}-${nextNumber}`;
  }

  const includeMainImage = Object.prototype.hasOwnProperty.call(data, 'mainImage');

  const assetData = {
    assetNumber,
    name: data.name,
    description: data.description,
    manufacturer: data.manufacturer,
    model: data.model,
    status: data.status,
    location: data.location,
    inUseBy: data.inUseBy,
    bookable: data.bookable ?? true,
    barcode: assetNumber,
    qrCode: assetNumber,
    customFieldValues: data.customFieldValues,
    parentAssetId: data.parentAssetId,
    isParent: data.isParent,
    childAssetIds: data.childAssetIds || [],
    assetGroup: data.assetGroup,
    assetGroupId: data.assetGroup?.id,
    assetGroupNumber: data.assetGroup?.groupNumber,
    assetGroupName: data.assetGroup?.name,
    fieldSources: data.fieldSources ?? {},
  mainImage: includeMainImage ? data.mainImage ?? null : undefined,
    schemaVersion: data.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    createdBy: user.id,
    createdByName: `${user.firstName} ${user.lastName}`,
    createdAt: new Date().toISOString(),
    lastModifiedBy: user.id,
    lastModifiedByName: `${user.firstName} ${user.lastName}`,
    lastModifiedAt: new Date().toISOString(),
  };

  const dataValue = {
    dataCategoryId: Number(assetType.id),
    value: JSON.stringify(assetData),
  };

  const created = await deps.apiClient.createDataValue(deps.moduleId, assetType.id, dataValue);
  const asset = deps.mapToAsset(created, assetType);

  await deps.recordChange({
    entityType: 'asset',
    entityId: asset.id,
    entityName: asset.name,
    action: 'created',
    newValue: asset.assetNumber,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return asset;
}

export async function updateAsset(
  deps: AssetDependencies,
  id: string,
  data: AssetUpdate,
): Promise<Asset> {
  const user = await deps.apiClient.getCurrentUser();
  const previous = await getAsset(deps, id);

  const updatedAssetData = mergeAssetData(previous, data, user);

  const payload = {
    id: Number(id),
    dataCategoryId: Number(previous.assetType.id),
    value: JSON.stringify(updatedAssetData),
  };

  const fullAssetType = await deps.getAssetType(previous.assetType.id);
  const updated = await deps.apiClient.updateDataValue(deps.moduleId, previous.assetType.id, id, payload);
  const asset = deps.mapToAsset(updated, fullAssetType);

  await recordAssetChanges(deps, asset, previous, updatedAssetData, user);

  return asset;
}

export async function deleteAsset(deps: AssetDependencies, id: string): Promise<void> {
  const user = await deps.apiClient.getCurrentUser();
  const asset = await getAsset(deps, id);

  if (asset.childAssetIds && asset.childAssetIds.length > 0) {
    const childrenWithBookings: Array<{ assetId: string; assetNumber: string; activeBookingCount: number }> = [];

    for (const childId of asset.childAssetIds) {
      const childAsset = await getAsset(deps, childId);
      const activeBookings = await deps.getBookingsForAsset(childId);
      const activeCount = activeBookings.filter((booking) =>
        booking.status === 'approved' || booking.status === 'active' || booking.status === 'pending',
      ).length;

      if (activeCount > 0) {
        childrenWithBookings.push({
          assetId: childId,
          assetNumber: childAsset.assetNumber,
          activeBookingCount: activeCount,
        });
      }
    }

    if (childrenWithBookings.length > 0) {
      throw new EdgeCaseError(
        `Cannot delete parent asset: ${childrenWithBookings.length} child asset(s) have active bookings`,
        {
          parentDeletionConflict: {
            parentId: id,
            childrenWithBookings,
          },
        },
      );
    }
  }

  await deps.recordChange({
    entityType: 'asset',
    entityId: id,
    entityName: asset.name,
    action: 'deleted',
    oldValue: asset.assetNumber,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  await updateAsset(deps, id, { status: 'deleted' });
}

function mergeAssetData(
  previous: Asset,
  data: AssetUpdate,
  user: { id: string; firstName: string; lastName: string },
): Record<string, unknown> {
  const hasAssetGroupUpdate = Object.prototype.hasOwnProperty.call(data, 'assetGroup');
  const updatedAssetGroup = hasAssetGroupUpdate ? (data.assetGroup ?? undefined) : previous.assetGroup;

  const hasFieldSourcesUpdate = Object.prototype.hasOwnProperty.call(data, 'fieldSources');
  let updatedFieldSources = hasFieldSourcesUpdate ? (data.fieldSources ?? undefined) : previous.fieldSources;
  if (hasAssetGroupUpdate && !updatedAssetGroup && !hasFieldSourcesUpdate) {
    updatedFieldSources = undefined;
  }

  const hasChildIdsUpdate = Object.prototype.hasOwnProperty.call(data, 'childAssetIds');
  const updatedChildIds = hasChildIdsUpdate ? (data.childAssetIds ?? []) : previous.childAssetIds ?? [];

  const hasMainImageUpdate = Object.prototype.hasOwnProperty.call(data, 'mainImage');
  const updatedMainImage = hasMainImageUpdate
    ? data.mainImage ?? null
    : previous.mainImage ?? undefined;

  const hasInUseByUpdate = Object.prototype.hasOwnProperty.call(data, 'inUseBy');
  const updatedInUseBy = hasInUseByUpdate
    ? (data.inUseBy ?? null)
    : previous.inUseBy ?? undefined;

  return {
    assetNumber: previous.assetNumber,
    name: data.name ?? previous.name,
    description: data.description ?? previous.description,
    manufacturer: data.manufacturer ?? previous.manufacturer,
    model: data.model ?? previous.model,
    status: data.status ?? previous.status,
    location: data.location ?? previous.location,
    inUseBy: updatedInUseBy,
    currentAssignmentId: Object.prototype.hasOwnProperty.call(data, 'currentAssignmentId')
      ? data.currentAssignmentId ?? null
      : previous.currentAssignmentId ?? null,
    barcode: data.barcode ?? previous.barcode,
    qrCode: data.qrCode ?? previous.qrCode,
    barcodeHistory: data.barcodeHistory ?? previous.barcodeHistory,
    customFieldValues: data.customFieldValues ?? previous.customFieldValues,
    parentAssetId: data.parentAssetId ?? previous.parentAssetId,
    isParent: data.isParent ?? previous.isParent,
    mainImage: updatedMainImage,
    bookable: data.bookable ?? previous.bookable,
    childAssetIds: updatedChildIds,
    assetGroup: updatedAssetGroup,
    assetGroupId: updatedAssetGroup?.id,
    assetGroupNumber: updatedAssetGroup?.groupNumber,
    assetGroupName: updatedAssetGroup?.name,
    fieldSources: updatedFieldSources,
    schemaVersion: data.schemaVersion ?? previous.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    createdBy: previous.createdBy,
    createdByName: previous.createdByName,
    createdAt: previous.createdAt,
    lastModifiedBy: user.id,
    lastModifiedByName: `${user.firstName} ${user.lastName}`,
    lastModifiedAt: new Date().toISOString(),
  };
}

async function recordAssetChanges(
  deps: AssetDependencies,
  asset: Asset,
  previous: Asset,
  updatedData: Record<string, unknown>,
  user: { id: string; firstName: string; lastName: string },
): Promise<void> {
  const changes: NonNullable<ChangeHistoryEntry['changes']> = [];
  const fieldsToTrack: Array<keyof Asset> = [
    'name',
    'description',
    'manufacturer',
    'model',
    'status',
    'location',
    'inUseBy',
    'currentAssignmentId',
    'barcode',
    'qrCode',
    'customFieldValues',
    'parentAssetId',
    'isParent',
    'mainImage',
  ];

  for (const field of fieldsToTrack) {
    const oldValue = previous[field];
    const newValue = updatedData[field as keyof typeof updatedData];

    if (!deps.valuesAreEqual(oldValue, newValue)) {
      const formattedOld = deps.formatFieldValue(oldValue);
      const formattedNew = deps.formatFieldValue(newValue);

      if (formattedOld !== formattedNew) {
        changes.push({
          field,
          oldValue: formattedOld,
          newValue: formattedNew,
        });
      }
    }
  }

  if (changes.length > 0) {
    await deps.recordChange({
      entityType: 'asset',
      entityId: asset.id,
      entityName: asset.name,
      action: 'updated',
      changes,
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });
  }
}

function applyAssetFilters(assets: Asset[], filters: AssetFilters): Asset[] {
  let filtered = assets;

  if (!filters.status || !filters.status.toString().includes('deleted')) {
    filtered = filtered.filter((asset) => asset.status !== 'deleted');
  }

  if (filters.assetTypeId) {
    filtered = filtered.filter((asset) => asset.assetType.id === filters.assetTypeId);
  }

  if (filters.status) {
    filtered = filtered.filter((asset) => asset.status === (filters.status as Asset['status']));
  }

  if (filters.location) {
    filtered = filtered.filter((asset) => asset.location === filters.location);
  }

  if (filters.parentAssetId) {
    filtered = filtered.filter((asset) => asset.parentAssetId === filters.parentAssetId);
  }

  if (filters.isParent !== undefined) {
    filtered = filtered.filter((asset) => asset.isParent === filters.isParent);
  }

  if (filters.assetGroupId) {
    filtered = filtered.filter((asset) => asset.assetGroup?.id === filters.assetGroupId);
  }

  if (filters.hasAssetGroup !== undefined) {
    filtered = filtered.filter((asset) => (filters.hasAssetGroup ? !!asset.assetGroup : !asset.assetGroup));
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter((asset) =>
      asset.name.toLowerCase().includes(query) ||
      asset.assetNumber.toLowerCase().includes(query) ||
      asset.description?.toLowerCase().includes(query) ||
      asset.barcode?.toLowerCase().includes(query) ||
      asset.assetGroup?.groupNumber?.toLowerCase().includes(query) ||
      asset.assetGroup?.name?.toLowerCase().includes(query),
    );
  }

  if (filters.customFields) {
    filtered = filtered.filter((asset) => matchesCustomFieldFilters(asset, filters.customFields as Record<string, unknown>));
  }

  return filtered;
}

function matchesCustomFieldFilters(asset: Asset, customFieldFilters: Record<string, unknown>): boolean {
  for (const [fieldId, filterValue] of Object.entries(customFieldFilters)) {
    const assetValue = asset.customFieldValues[fieldId];

    if (filterValue === null || filterValue === undefined) {
      continue;
    }

    if (!assetValue) {
      return false;
    }

    if (Array.isArray(filterValue)) {
      if (!Array.isArray(assetValue)) {
        return false;
      }

      const hasMatch = filterValue.some((option) => (assetValue as unknown[]).includes(option));
      if (!hasMatch) {
        return false;
      }
    } else if (Array.isArray(assetValue)) {
      if (!(assetValue as unknown[]).includes(filterValue)) {
        return false;
      }
    } else if (typeof filterValue === 'string' || typeof filterValue === 'number' || typeof filterValue === 'boolean') {
      const assetStr = String(assetValue).toLowerCase();
      const filterStr = String(filterValue).toLowerCase();
      if (!assetStr.includes(filterStr)) {
        return false;
      }
    } else if (filterValue !== assetValue) {
      return false;
    }
  }

  return true;
}
