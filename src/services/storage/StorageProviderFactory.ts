import type { IStorageProvider, StorageProviderConfig } from '../../types/storage';
import { ChurchToolsStorageProvider } from './ChurchToolsProvider';
import type { ChurchToolsAPIClient } from '../api/ChurchToolsAPIClient';

/**
 * Storage Provider Factory
 * Creates the appropriate storage provider based on configuration
 */
export function createStorageProvider(config: StorageProviderConfig): IStorageProvider {
    switch (config.type) {
        case 'churchtools': {
            if (!config.churchtools) {
                throw new Error('ChurchTools configuration is required');
            }
            const provider = new ChurchToolsStorageProvider(
                config.churchtools.moduleId,
                config.churchtools.apiClient as ChurchToolsAPIClient
            );
            return provider as unknown as IStorageProvider;
        }
        case 'mock':
            throw new Error('Mock storage provider not yet implemented');
        
        default:
            throw new Error(`Unknown storage provider type: ${(config as { type: string }).type}`);
    }
}
