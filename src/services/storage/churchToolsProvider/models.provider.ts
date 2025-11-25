import type { AssetModel, AssetModelCreate, AssetModelUpdate } from '../../../types/model';
import type { AssetModelDependencies } from './models';
import {
  createAssetModel as createAssetModelHandler,
  deleteAssetModel as deleteAssetModelHandler,
  getAssetModel as getAssetModelHandler,
  getAssetModels as getAssetModelsHandler,
  updateAssetModel as updateAssetModelHandler,
} from './models';
import { ChurchToolsStorageProvider } from './core';

declare module './core' {
  interface ChurchToolsStorageProvider {
    getAssetModels(): Promise<AssetModel[]>;
    getAssetModel(id: string): Promise<AssetModel | null>;
    createAssetModel(data: AssetModelCreate): Promise<AssetModel>;
    updateAssetModel(id: string, data: AssetModelUpdate): Promise<AssetModel>;
    deleteAssetModel(id: string): Promise<void>;
  }
}

function getModelDependencies(provider: ChurchToolsStorageProvider): AssetModelDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    getAllAssetTypesIncludingHistory: provider.getAllAssetTypesIncludingHistory.bind(provider),
    recordChange: provider.recordChange.bind(provider),
  };
}

ChurchToolsStorageProvider.prototype.getAssetModels = async function getAssetModels(
  this: ChurchToolsStorageProvider,
): Promise<AssetModel[]> {
  return getAssetModelsHandler(getModelDependencies(this));
};

ChurchToolsStorageProvider.prototype.getAssetModel = async function getAssetModel(
  this: ChurchToolsStorageProvider,
  id: string,
): Promise<AssetModel | null> {
  return getAssetModelHandler(getModelDependencies(this), id);
};

ChurchToolsStorageProvider.prototype.createAssetModel = async function createAssetModel(
  this: ChurchToolsStorageProvider,
  data: AssetModelCreate,
): Promise<AssetModel> {
  return createAssetModelHandler(getModelDependencies(this), data);
};

ChurchToolsStorageProvider.prototype.updateAssetModel = async function updateAssetModel(
  this: ChurchToolsStorageProvider,
  id: string,
  data: AssetModelUpdate,
): Promise<AssetModel> {
  return updateAssetModelHandler(getModelDependencies(this), id, data);
};

ChurchToolsStorageProvider.prototype.deleteAssetModel = async function deleteAssetModel(
  this: ChurchToolsStorageProvider,
  id: string,
): Promise<void> {
  await deleteAssetModelHandler(getModelDependencies(this), id);
};
