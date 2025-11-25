import { ChurchToolsStorageProvider } from './core';
import {
  getModuleDefaultPrefixId as getModuleDefaultPrefix,
  setModuleDefaultPrefixId as setModuleDefaultPrefix,
  getPersonDefaultPrefixId as getPersonDefaultPrefix,
  setPersonDefaultPrefixId as setPersonDefaultPrefix,
} from './prefixPreferences';

declare module './core' {
  interface ChurchToolsStorageProvider {
    getModuleDefaultPrefixId(): Promise<string | null>;
    setModuleDefaultPrefixId(prefixId: string | null): Promise<void>;
    getPersonDefaultPrefixId(personId: string): Promise<string | null>;
    setPersonDefaultPrefixId(personId: string, prefixId: string | null): Promise<void>;
  }
}

function getDeps(provider: ChurchToolsStorageProvider) {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    recordChange: provider.recordChange.bind(provider),
  };
}

ChurchToolsStorageProvider.prototype.getModuleDefaultPrefixId = async function getModuleDefaultPrefixId(
  this: ChurchToolsStorageProvider,
): Promise<string | null> {
  return await getModuleDefaultPrefix(getDeps(this));
};

ChurchToolsStorageProvider.prototype.setModuleDefaultPrefixId = async function setModuleDefaultPrefixId(
  this: ChurchToolsStorageProvider,
  prefixId: string | null,
): Promise<void> {
  await setModuleDefaultPrefix(getDeps(this), prefixId);
};

ChurchToolsStorageProvider.prototype.getPersonDefaultPrefixId = async function getPersonDefaultPrefixId(
  this: ChurchToolsStorageProvider,
  personId: string,
): Promise<string | null> {
  return await getPersonDefaultPrefix(getDeps(this), personId);
};

ChurchToolsStorageProvider.prototype.setPersonDefaultPrefixId = async function setPersonDefaultPrefixId(
  this: ChurchToolsStorageProvider,
  personId: string,
  prefixId: string | null,
): Promise<void> {
  await setPersonDefaultPrefix(getDeps(this), personId, prefixId);
};
