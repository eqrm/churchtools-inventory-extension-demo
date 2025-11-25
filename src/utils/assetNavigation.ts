import type { Asset } from '../types/entities';
import { stripKitIdPrefix } from './kitAssets';

export function getAssetDetailPath(asset: Pick<Asset, 'id' | 'isKit' | 'kitId'>): string {
  if (asset.isKit) {
    const kitId = asset.kitId ?? stripKitIdPrefix(asset.id);
    return `/kits/${kitId}`;
  }
  return `/assets/${asset.id}`;
}
