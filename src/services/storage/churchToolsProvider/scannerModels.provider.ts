import { ChurchToolsStorageProvider } from './core';
import { getScannerModels, saveScannerModels } from './scannerModels';
import type { ScannerModel } from '../../../types/entities';

declare module './core' {
  interface ChurchToolsStorageProvider {
    getScannerModels(): Promise<ScannerModel[]>;
    saveScannerModels(models: ScannerModel[]): Promise<void>;
  }
}

function getDeps(provider: ChurchToolsStorageProvider) {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    recordChange: provider.recordChange.bind(provider),
  };
}

ChurchToolsStorageProvider.prototype.getScannerModels = async function getScannerModelsWrapper(
  this: ChurchToolsStorageProvider,
): Promise<ScannerModel[]> {
  return await getScannerModels(getDeps(this));
};

ChurchToolsStorageProvider.prototype.saveScannerModels = async function saveScannerModelsWrapper(
  this: ChurchToolsStorageProvider,
  models: ScannerModel[],
): Promise<void> {
  await saveScannerModels(getDeps(this), models);
};
