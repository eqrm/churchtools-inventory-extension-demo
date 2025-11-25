import { ChurchToolsStorageProvider } from './core';
import { getGlobalSetting, setGlobalSetting } from './globalSettings';

declare module './core' {
  interface ChurchToolsStorageProvider {
    getGlobalSetting<T>(key: string): Promise<T | null>;
    setGlobalSetting(key: string, value: unknown): Promise<void>;
  }
}

function getDeps(provider: ChurchToolsStorageProvider) {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    recordChange: provider.recordChange.bind(provider),
  };
}

ChurchToolsStorageProvider.prototype.getGlobalSetting = async function getGlobalSettingWrapper<T>(
  this: ChurchToolsStorageProvider,
  key: string,
): Promise<T | null> {
  return await getGlobalSetting<T>(getDeps(this), key);
};

ChurchToolsStorageProvider.prototype.setGlobalSetting = async function setGlobalSettingWrapper(
  this: ChurchToolsStorageProvider,
  key: string,
  value: unknown,
): Promise<void> {
  await setGlobalSetting(getDeps(this), key, value);
};
