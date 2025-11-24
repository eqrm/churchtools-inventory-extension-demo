import type { Migration, MigrationContext } from '../types';
import { getChurchToolsStorageProvider } from '../../churchTools/storageProvider';

const ASSET_PREFIX_STORAGE_KEY = 'assetNumberPrefix';
const SCANNER_MODELS_STORAGE_KEY = 'scannerModels';

export const moveLocalSettingsToChurchTools: Migration = {
  id: 'move-local-settings-to-ct',
  description: 'Move local settings (prefix, scanner models) to ChurchTools storage',
  fromVersion: '1.2.0',
  toVersion: '1.3.0',
  up: async (context: MigrationContext) => {
    const { log } = context;
    const provider = getChurchToolsStorageProvider();

    // 1. Migrate Asset Prefix
    const localPrefix = localStorage.getItem(ASSET_PREFIX_STORAGE_KEY);
    if (localPrefix) {
      log?.(`Found local asset prefix: ${localPrefix}. Migrating to ChurchTools...`);
      await provider.setGlobalSetting('assetNumberPrefix', localPrefix);
      // We don't delete from localStorage yet to be safe, or we can.
      // Let's keep it as a fallback for now, or maybe rename it to indicate it's migrated.
      localStorage.setItem(`${ASSET_PREFIX_STORAGE_KEY}_migrated`, localPrefix);
    } else {
      log?.('No local asset prefix found.');
    }

    // 2. Migrate Scanner Models
    const localScannerModels = localStorage.getItem(SCANNER_MODELS_STORAGE_KEY);
    if (localScannerModels) {
      try {
        const models = JSON.parse(localScannerModels);
        if (Array.isArray(models) && models.length > 0) {
          log?.(`Found ${models.length} local scanner models. Migrating to ChurchTools...`);
          await provider.saveScannerModels(models);
          localStorage.setItem(`${SCANNER_MODELS_STORAGE_KEY}_migrated`, localScannerModels);
        } else {
            log?.('Local scanner models empty or invalid.');
        }
      } catch (e) {
        log?.(`Failed to parse local scanner models: ${e}`);
      }
    } else {
      log?.('No local scanner models found.');
    }
  },
  down: async (context: MigrationContext) => {
    // No-op: We don't want to delete data from ChurchTools on rollback of this specific migration
    // unless we are sure.
    context.log?.('Downgrade for move-local-settings-to-ct is not implemented (safe no-op).');
  },
};
