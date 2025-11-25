import type { Asset } from '../types/entities';
import type { IStorageProvider } from '../types/storage';
import type { KitService } from '../services/KitService';
import { isKitAssetId, stripKitIdPrefix, mapKitToAsset } from './kitAssets';

export interface AssetResolutionDependencies {
  storageProvider: Pick<IStorageProvider, 'getAsset'> | null | undefined;
  kitService: Pick<KitService, 'getKit'> | null | undefined;
}

/**
 * Resolve either a regular asset or a kit-backed pseudo asset by ID.
 */
export async function resolveAssetById(id: string, deps: AssetResolutionDependencies): Promise<Asset> {
  if (isKitAssetId(id)) {
    const kitId = stripKitIdPrefix(id);
    if (!deps.kitService) {
      throw new Error('Kit service unavailable');
    }
    const kit = await deps.kitService.getKit(kitId);
    if (!kit) {
      throw new Error(`Kit ${kitId} not found`);
    }
    return mapKitToAsset(kit);
  }

  if (!deps.storageProvider) {
    throw new Error('Storage provider not initialized');
  }

  const asset = await deps.storageProvider.getAsset(id);
  if (!asset) {
    throw new Error(`Asset with ID ${id} not found`);
  }
  return asset;
}
