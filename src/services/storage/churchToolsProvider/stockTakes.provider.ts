import type {
  StockTakeSession,
  StockTakeSessionCreate,
  StockTakeStatus,
} from '../../../types/entities'
import type { StockTakeDependencies } from './stockTakes'
import {
  addStockTakeScan as addStockTakeScanHandler,
  cancelStockTakeSession as cancelStockTakeSessionHandler,
  completeStockTakeSession as completeStockTakeSessionHandler,
  createStockTakeSession as createStockTakeSessionHandler,
  deleteStockTakeSession as deleteStockTakeSessionHandler,
  getStockTakeSession as getStockTakeSessionHandler,
  getStockTakeSessions as getStockTakeSessionsHandler,
} from './stockTakes'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getStockTakeSessions(filters?: { status?: StockTakeStatus }): Promise<StockTakeSession[]>
    getStockTakeSession(id: string): Promise<StockTakeSession>
    createStockTakeSession(data: StockTakeSessionCreate): Promise<StockTakeSession>
    addStockTakeScan(
      sessionId: string,
      assetId: string,
      scannedBy: string,
      location?: string,
    ): Promise<StockTakeSession>
    completeStockTakeSession(sessionId: string): Promise<StockTakeSession>
    cancelStockTakeSession(sessionId: string): Promise<void>
    deleteStockTakeSession(sessionId: string): Promise<void>
  }
}

type ProviderWithStockTakeSupport = ChurchToolsStorageProvider & {
  getAssets: () => Promise<import('../../../types/entities').Asset[]>
  getAsset: (id: string) => Promise<import('../../../types/entities').Asset>
}

function getStockTakeDependencies(provider: ProviderWithStockTakeSupport): StockTakeDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    getAllCategoriesIncludingHistory: provider.getAllCategoriesIncludingHistory.bind(provider),
    mapToAssetType: provider.mapToAssetType.bind(provider),
    recordChange: provider.recordChange.bind(provider),
    getAssets: provider.getAssets.bind(provider),
    getAsset: provider.getAsset.bind(provider),
  }
}

ChurchToolsStorageProvider.prototype.getStockTakeSessions = async function getStockTakeSessions(
  this: ProviderWithStockTakeSupport,
  filters?: { status?: StockTakeStatus },
): Promise<StockTakeSession[]> {
  return getStockTakeSessionsHandler(getStockTakeDependencies(this), filters)
}

ChurchToolsStorageProvider.prototype.getStockTakeSession = async function getStockTakeSession(
  this: ProviderWithStockTakeSupport,
  id: string,
): Promise<StockTakeSession> {
  return getStockTakeSessionHandler(getStockTakeDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.createStockTakeSession = async function createStockTakeSession(
  this: ProviderWithStockTakeSupport,
  data: StockTakeSessionCreate,
): Promise<StockTakeSession> {
  return createStockTakeSessionHandler(getStockTakeDependencies(this), data)
}

ChurchToolsStorageProvider.prototype.addStockTakeScan = async function addStockTakeScan(
  this: ProviderWithStockTakeSupport,
  sessionId: string,
  assetId: string,
  scannedBy: string,
  location?: string,
): Promise<StockTakeSession> {
  return addStockTakeScanHandler(getStockTakeDependencies(this), sessionId, assetId, scannedBy, location)
}

ChurchToolsStorageProvider.prototype.completeStockTakeSession = async function completeStockTakeSession(
  this: ProviderWithStockTakeSupport,
  sessionId: string,
): Promise<StockTakeSession> {
  return completeStockTakeSessionHandler(getStockTakeDependencies(this), sessionId)
}

ChurchToolsStorageProvider.prototype.cancelStockTakeSession = async function cancelStockTakeSession(
  this: ProviderWithStockTakeSupport,
  sessionId: string,
): Promise<void> {
  await cancelStockTakeSessionHandler(getStockTakeDependencies(this), sessionId)
}

ChurchToolsStorageProvider.prototype.deleteStockTakeSession = async function deleteStockTakeSession(
  this: ProviderWithStockTakeSupport,
  sessionId: string,
): Promise<void> {
  await deleteStockTakeSessionHandler(getStockTakeDependencies(this), sessionId)
}
