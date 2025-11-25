import type { Kit, KitCreate, KitUpdate } from '../../../types/entities'
import type { KitDependencies } from './kits'
import {
  createKit as createKitHandler,
  deleteKit as deleteKitHandler,
  getKit as getKitHandler,
  getKits as getKitsHandler,
  isKitAvailable as isKitAvailableHandler,
  updateKit as updateKitHandler,
} from './kits'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getKits(): Promise<Kit[]>
    getKit(id: string): Promise<Kit | null>
    createKit(data: KitCreate): Promise<Kit>
    updateKit(id: string, data: KitUpdate): Promise<Kit>
    deleteKit(id: string): Promise<void>
    isKitAvailable(
      kitId: string,
      startDate: string,
      endDate: string,
    ): Promise<{ available: boolean; unavailableAssets?: string[]; reason?: string }>
  }
}

type ProviderWithKitSupport = ChurchToolsStorageProvider & {
  getAsset: (id: string) => Promise<import('../../../types/entities').Asset>
  getAssets: () => Promise<import('../../../types/entities').Asset[]>
  isAssetAvailable: (assetId: string, startDate: string, endDate: string) => Promise<boolean>
  getBookings: (filters?: import('../../../types/entities').BookingFilters) => Promise<import('../../../types/entities').Booking[]>
}

function getKitDependencies(provider: ProviderWithKitSupport): KitDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    getAllCategoriesIncludingHistory: provider.getAllCategoriesIncludingHistory.bind(provider),
    mapToAssetType: provider.mapToAssetType.bind(provider),
    recordChange: provider.recordChange.bind(provider),
    getAsset: provider.getAsset.bind(provider),
    getAssets: provider.getAssets.bind(provider),
    isAssetAvailable: provider.isAssetAvailable.bind(provider),
    getBookings: provider.getBookings.bind(provider),
  }
}

ChurchToolsStorageProvider.prototype.getKits = async function getKits(
  this: ProviderWithKitSupport,
): Promise<Kit[]> {
  return getKitsHandler(getKitDependencies(this))
}

ChurchToolsStorageProvider.prototype.getKit = async function getKit(
  this: ProviderWithKitSupport,
  id: string,
): Promise<Kit | null> {
  return getKitHandler(getKitDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.createKit = async function createKit(
  this: ProviderWithKitSupport,
  data: KitCreate,
): Promise<Kit> {
  return createKitHandler(getKitDependencies(this), data)
}

ChurchToolsStorageProvider.prototype.updateKit = async function updateKit(
  this: ProviderWithKitSupport,
  id: string,
  data: KitUpdate,
): Promise<Kit> {
  return updateKitHandler(getKitDependencies(this), id, data)
}

ChurchToolsStorageProvider.prototype.deleteKit = async function deleteKit(
  this: ProviderWithKitSupport,
  id: string,
): Promise<void> {
  await deleteKitHandler(getKitDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.isKitAvailable = async function isKitAvailable(
  this: ProviderWithKitSupport,
  kitId: string,
  startDate: string,
  endDate: string,
): Promise<{ available: boolean; unavailableAssets?: string[]; reason?: string }> {
  return isKitAvailableHandler(getKitDependencies(this), kitId, startDate, endDate)
}
