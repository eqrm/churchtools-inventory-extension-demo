import type { AssetType, AssetTypeCreate, AssetTypeUpdate } from '../../../types/entities'
import {
  createAssetType as createAssetTypeHandler,
  deleteAssetType as deleteAssetTypeHandler,
  getAssetType as getAssetTypeHandler,
  getAssetTypes as getAssetTypesHandler,
  type AssetTypeDependencies,
  updateAssetType as updateAssetTypeHandler,
} from './categories'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getAssetTypes(): Promise<AssetType[]>
    getAssetType(id: string): Promise<AssetType>
    createAssetType(data: AssetTypeCreate): Promise<AssetType>
    updateAssetType(id: string, data: AssetTypeUpdate): Promise<AssetType>
    deleteAssetType(id: string): Promise<void>
  }
}

type ProviderWithAssets = ChurchToolsStorageProvider & {
  getAssets: AssetTypeDependencies['getAssets']
}

function getAssetTypeDependencies(provider: ChurchToolsStorageProvider): AssetTypeDependencies {
  const providerWithAssets = provider as ProviderWithAssets
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    getAllAssetTypesIncludingHistory: provider.getAllAssetTypesIncludingHistory.bind(provider),
    mapToAssetType: provider.mapToAssetType.bind(provider),
    recordChange: provider.recordChange.bind(provider),
    valuesAreEqual: provider.valuesAreEqual.bind(provider),
    formatFieldValue: provider.formatFieldValue.bind(provider),
    getAssets: providerWithAssets.getAssets.bind(providerWithAssets),
  }
}

ChurchToolsStorageProvider.prototype.getAssetTypes = async function getAssetTypes(
  this: ChurchToolsStorageProvider,
): Promise<AssetType[]> {
  return getAssetTypesHandler(getAssetTypeDependencies(this))
}

ChurchToolsStorageProvider.prototype.getAssetType = async function getAssetType(
  this: ChurchToolsStorageProvider,
  id: string,
): Promise<AssetType> {
  return getAssetTypeHandler(getAssetTypeDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.createAssetType = async function createAssetType(
  this: ChurchToolsStorageProvider,
  data: AssetTypeCreate,
): Promise<AssetType> {
  return createAssetTypeHandler(getAssetTypeDependencies(this), data)
}

ChurchToolsStorageProvider.prototype.updateAssetType = async function updateAssetType(
  this: ChurchToolsStorageProvider,
  id: string,
  data: AssetTypeUpdate,
): Promise<AssetType> {
  return updateAssetTypeHandler(getAssetTypeDependencies(this), id, data)
}

ChurchToolsStorageProvider.prototype.deleteAssetType = async function deleteAssetType(
  this: ChurchToolsStorageProvider,
  id: string,
): Promise<void> {
  await deleteAssetTypeHandler(getAssetTypeDependencies(this), id)
}
