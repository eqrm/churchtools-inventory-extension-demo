import type { SavedView, SavedViewCreate } from '../../../types/entities'
import type { SavedViewDependencies } from './savedViews'
import {
  createSavedView as createSavedViewHandler,
  deleteSavedView as deleteSavedViewHandler,
  getSavedViews as getSavedViewsHandler,
  updateSavedView as updateSavedViewHandler,
} from './savedViews'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getSavedViews(userId: string): Promise<SavedView[]>
    createSavedView(data: SavedViewCreate): Promise<SavedView>
    updateSavedView(id: string, updates: Partial<SavedView>): Promise<SavedView>
    deleteSavedView(id: string): Promise<void>
  }
}

function getSavedViewDependencies(provider: ChurchToolsStorageProvider): SavedViewDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    getAllCategoriesIncludingHistory: provider.getAllCategoriesIncludingHistory.bind(provider),
    mapToAssetType: provider.mapToAssetType.bind(provider),
    recordChange: provider.recordChange.bind(provider),
  }
}

ChurchToolsStorageProvider.prototype.getSavedViews = async function getSavedViews(
  this: ChurchToolsStorageProvider,
  userId: string,
): Promise<SavedView[]> {
  return getSavedViewsHandler(getSavedViewDependencies(this), userId)
}

ChurchToolsStorageProvider.prototype.createSavedView = async function createSavedView(
  this: ChurchToolsStorageProvider,
  data: SavedViewCreate,
): Promise<SavedView> {
  return createSavedViewHandler(getSavedViewDependencies(this), data)
}

ChurchToolsStorageProvider.prototype.updateSavedView = async function updateSavedView(
  this: ChurchToolsStorageProvider,
  id: string,
  updates: Partial<SavedView>,
): Promise<SavedView> {
  return updateSavedViewHandler(getSavedViewDependencies(this), id, updates)
}

ChurchToolsStorageProvider.prototype.deleteSavedView = async function deleteSavedView(
  this: ChurchToolsStorageProvider,
  id: string,
): Promise<void> {
  await deleteSavedViewHandler(getSavedViewDependencies(this), id)
}
