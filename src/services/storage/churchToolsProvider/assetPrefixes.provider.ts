import type {
  AssetPrefix,
  AssetPrefixCreate,
  AssetPrefixUpdate,
} from '../../../types/entities'
import type { AssetPrefixDependencies } from './assetPrefixes'
import {
  createAssetPrefix as createAssetPrefixHandler,
  deleteAssetPrefix as deleteAssetPrefixHandler,
  getAssetPrefix as getAssetPrefixHandler,
  getAssetPrefixes as getAssetPrefixesHandler,
  incrementPrefixSequence as incrementPrefixSequenceHandler,
  updateAssetPrefix as updateAssetPrefixHandler,
} from './assetPrefixes'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getAssetPrefixes(): Promise<AssetPrefix[]>
    getAssetPrefix(id: string): Promise<AssetPrefix>
    createAssetPrefix(data: AssetPrefixCreate): Promise<AssetPrefix>
    updateAssetPrefix(id: string, data: AssetPrefixUpdate): Promise<AssetPrefix>
    deleteAssetPrefix(id: string): Promise<void>
    incrementPrefixSequence(prefixId: string): Promise<number>
  }
}

function getAssetPrefixDependencies(provider: ChurchToolsStorageProvider): AssetPrefixDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    mapToAssetType: provider.mapToAssetType.bind(provider),
    recordChange: provider.recordChange.bind(provider),
  }
}

ChurchToolsStorageProvider.prototype.getAssetPrefixes = async function getAssetPrefixes(
  this: ChurchToolsStorageProvider,
): Promise<AssetPrefix[]> {
  return getAssetPrefixesHandler(getAssetPrefixDependencies(this))
}

ChurchToolsStorageProvider.prototype.getAssetPrefix = async function getAssetPrefix(
  this: ChurchToolsStorageProvider,
  id: string,
): Promise<AssetPrefix> {
  return getAssetPrefixHandler(getAssetPrefixDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.createAssetPrefix = async function createAssetPrefix(
  this: ChurchToolsStorageProvider,
  data: AssetPrefixCreate,
): Promise<AssetPrefix> {
  return createAssetPrefixHandler(getAssetPrefixDependencies(this), data)
}

ChurchToolsStorageProvider.prototype.updateAssetPrefix = async function updateAssetPrefix(
  this: ChurchToolsStorageProvider,
  id: string,
  data: AssetPrefixUpdate,
): Promise<AssetPrefix> {
  return updateAssetPrefixHandler(getAssetPrefixDependencies(this), id, data)
}

ChurchToolsStorageProvider.prototype.deleteAssetPrefix = async function deleteAssetPrefix(
  this: ChurchToolsStorageProvider,
  id: string,
): Promise<void> {
  await deleteAssetPrefixHandler(getAssetPrefixDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.incrementPrefixSequence = async function incrementPrefixSequence(
  this: ChurchToolsStorageProvider,
  prefixId: string,
): Promise<number> {
  return incrementPrefixSequenceHandler(getAssetPrefixDependencies(this), prefixId)
}
