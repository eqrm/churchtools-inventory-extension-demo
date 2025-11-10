import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type {
  Asset,
  AssetType,
  AssetFilters,
  ChangeHistoryEntry,
  StockTakeSession,
  StockTakeSessionCreate,
  StockTakeStatus,
} from '../../../types/entities';
import { EdgeCaseError } from '../../../types/edge-cases';
import { BASE_SCHEMA_VERSION, CURRENT_SCHEMA_VERSION } from '../../migrations/constants';

export interface StockTakeDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  getAllCategoriesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
  getAssets(filters?: AssetFilters): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset>;
}

type StockTakeFilters = {
  status?: StockTakeStatus;
};

export async function getStockTakeSessions(
  deps: StockTakeDependencies,
  filters?: StockTakeFilters,
): Promise<StockTakeSession[]> {
  const category = await getStockTakeCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);

  let sessions = values.map((val) => mapToStockTakeSession(val));

  if (filters?.status) {
    sessions = sessions.filter((session) => session.status === filters.status);
  }

  return sessions;
}

export async function getStockTakeSession(
  deps: StockTakeDependencies,
  id: string,
): Promise<StockTakeSession> {
  const sessions = await getStockTakeSessions(deps);
  const match = sessions.find((session) => session.id === id);

  if (!match) {
    throw new Error(`Stock take session with ID ${id} not found`);
  }

  return match;
}

export async function createStockTakeSession(
  deps: StockTakeDependencies,
  data: StockTakeSessionCreate,
): Promise<StockTakeSession> {
  const user = await deps.apiClient.getCurrentUser();
  const category = await getStockTakeCategory(deps);
  const expectedAssets = await loadExpectedAssetsForScope(deps, data.scope);

  const sessionData: Omit<StockTakeSession, 'id'> = {
    nameReason: data.nameReason,
    startDate: data.startDate,
    completedDate: data.completedDate,
    status: data.status,
    scope: data.scope,
    expectedAssets: expectedAssets.map((asset) => ({
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      location: asset.location,
    })),
    scannedAssets: [],
    missingAssets: [],
    unexpectedAssets: [],
    conductedBy: data.conductedBy,
    conductedByName: data.conductedByName,
    createdAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  const value = {
    dataCategoryId: Number(category.id),
    value: JSON.stringify(sessionData),
  };

  const created = await deps.apiClient.createDataValue(deps.moduleId, category.id, value);
  const session: StockTakeSession = {
    ...sessionData,
    id: String((created as { id: string | number }).id),
  };

  await deps.recordChange({
    entityType: 'stocktake',
    entityId: session.id,
    action: 'created',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return session;
}

export async function addStockTakeScan(
  deps: StockTakeDependencies,
  sessionId: string,
  assetId: string,
  scannedBy: string,
  location?: string,
): Promise<StockTakeSession> {
  const user = await deps.apiClient.getCurrentUser();
  const category = await getStockTakeCategory(deps);
  const session = await getStockTakeSession(deps, sessionId);

  const existingScan = session.scannedAssets.find((scan) => scan.assetId === assetId);
  if (existingScan) {
    throw new EdgeCaseError('Asset already scanned in this session', {
      duplicateScan: {
        assetId,
        assetNumber: existingScan.assetNumber,
        scannedAt: existingScan.scannedAt,
        scannedBy: existingScan.scannedByName,
      },
    });
  }

  if (session.status !== 'active') {
    throw new Error(`Cannot add scans to a ${session.status} session`);
  }

  const assetNumber = await getAssetNumberForScan(deps, assetId);
  const scanRecord = {
    assetId,
    assetNumber,
    scannedAt: new Date().toISOString(),
    scannedBy,
    scannedByName: scannedBy,
    location,
    condition: undefined,
  };

  const updatedSession: StockTakeSession = {
    ...session,
    scannedAssets: [...session.scannedAssets, scanRecord],
    lastModifiedAt: new Date().toISOString(),
    schemaVersion: session.schemaVersion ?? CURRENT_SCHEMA_VERSION,
  };

  const payload = {
    id: Number(sessionId),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(updatedSession),
  };

  await deps.apiClient.updateDataValue(deps.moduleId, category.id, sessionId, payload);

  await deps.recordChange({
    entityType: 'stocktake',
    entityId: sessionId,
    action: 'updated',
    newValue: assetId,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return updatedSession;
}

export async function completeStockTakeSession(
  deps: StockTakeDependencies,
  sessionId: string,
): Promise<StockTakeSession> {
  const user = await deps.apiClient.getCurrentUser();
  const category = await getStockTakeCategory(deps);
  const session = await getStockTakeSession(deps, sessionId);

  if (session.status !== 'active') {
    throw new Error(`Cannot complete a ${session.status} session`);
  }

  const scannedAssetIds = new Set(session.scannedAssets.map((scan) => scan.assetId));
  const expectedMap = new Map(session.expectedAssets.map((entry) => [entry.assetId, entry]));

  const missingAssets = session.expectedAssets
    .filter((expected) => !scannedAssetIds.has(expected.assetId))
    .map((expected) => ({
      assetId: expected.assetId,
      assetNumber: expected.assetNumber,
      name: expected.name,
      lastKnownLocation: expected.location,
    }));

  const unexpectedAssets = session.scannedAssets
    .filter((scan) => !expectedMap.has(scan.assetId))
    .map((scan) => ({
      assetId: scan.assetId,
      assetNumber: scan.assetNumber,
      name: scan.assetNumber,
    }));

  const updatedSession: StockTakeSession = {
    ...session,
    status: 'completed',
    missingAssets,
    unexpectedAssets,
    completedDate: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    schemaVersion: session.schemaVersion ?? CURRENT_SCHEMA_VERSION,
  };

  const payload = {
    id: Number(sessionId),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(updatedSession),
  };

  await deps.apiClient.updateDataValue(deps.moduleId, category.id, sessionId, payload);

  await deps.recordChange({
    entityType: 'stocktake',
    entityId: sessionId,
    action: 'updated',
    newValue: `${String(session.scannedAssets.length)}/${String(session.expectedAssets.length)} assets scanned`,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return updatedSession;
}

export async function cancelStockTakeSession(
  deps: StockTakeDependencies,
  sessionId: string,
): Promise<void> {
  const user = await deps.apiClient.getCurrentUser();
  const category = await getStockTakeCategory(deps);
  const session = await getStockTakeSession(deps, sessionId);

  if (session.status !== 'active') {
    throw new Error(`Cannot cancel a ${session.status} session`);
  }

  const updatedSession: StockTakeSession = {
    ...session,
    status: 'cancelled',
    completedDate: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    schemaVersion: session.schemaVersion ?? CURRENT_SCHEMA_VERSION,
  };

  const payload = {
    id: Number(sessionId),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(updatedSession),
  };

  await deps.apiClient.updateDataValue(deps.moduleId, category.id, sessionId, payload);

  await deps.recordChange({
    entityType: 'stocktake',
    entityId: sessionId,
    action: 'deleted',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

export async function deleteStockTakeSession(
  deps: StockTakeDependencies,
  sessionId: string,
): Promise<void> {
  try {
    await getStockTakeSession(deps, sessionId);
  } catch {
    return;
  }

  const user = await deps.apiClient.getCurrentUser();
  const category = await getStockTakeCategory(deps);

  await deps.apiClient.deleteDataValue(deps.moduleId, category.id, sessionId);

  await deps.recordChange({
    entityType: 'stocktake',
    entityId: sessionId,
    action: 'deleted',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

async function getStockTakeCategory(deps: StockTakeDependencies): Promise<AssetType> {
  const categories = await deps.getAllCategoriesIncludingHistory();
  let category = categories.find((cat) => cat.name === '__StockTakeSessions__');

  if (!category) {
    const user = await deps.apiClient.getCurrentUser();
    const shorty = `stocktake_${Date.now().toString().slice(-4)}`;

    const payload = {
      customModuleId: Number(deps.moduleId),
      name: '__StockTakeSessions__',
      shorty,
      description: 'Internal category for stock take sessions',
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

function mapToStockTakeSession(value: unknown): StockTakeSession {
  const record = value as { id: string; value: string };
  const parsed = typeof record.value === 'string' ? (JSON.parse(record.value) as StockTakeSession) : (record as unknown as StockTakeSession);

  return {
    ...parsed,
    id: String(record.id ?? parsed.id),
    schemaVersion: parsed.schemaVersion ?? BASE_SCHEMA_VERSION,
  };
}

async function loadExpectedAssetsForScope(
  deps: StockTakeDependencies,
  scope: StockTakeSessionCreate['scope'],
): Promise<Asset[]> {
  switch (scope.type) {
    case 'all':
      return deps.getAssets();
    case 'assetType': {
      const results: Asset[] = [];
      for (const assetTypeId of scope.assetTypeIds ?? []) {
        const assets = await deps.getAssets({ assetTypeId });
        results.push(...assets);
      }
      return results;
    }
    case 'location': {
      const results: Asset[] = [];
      for (const location of scope.locations ?? []) {
        const assets = await deps.getAssets({ location });
        results.push(...assets);
      }
      return results;
    }
    case 'custom': {
      const results: Asset[] = [];
      for (const assetId of scope.assetIds ?? []) {
        try {
          const asset = await deps.getAsset(assetId);
          results.push(asset);
        } catch {
          console.warn(`Asset ${assetId} not found, skipping`);
        }
      }
      return results;
    }
    default:
      return [];
  }
}

async function getAssetNumberForScan(
  deps: StockTakeDependencies,
  assetId: string,
): Promise<string> {
  try {
    const asset = await deps.getAsset(assetId);
    return asset.assetNumber;
  } catch {
    console.warn(`Asset ${assetId} not found in inventory`);
    return 'Unknown';
  }
}
