import type { Asset } from '../types/entities';

/**
 * T2.2.1: Kit assets navigate to /assets/{assetId} like regular assets.
 * Kit details are shown inline in the asset detail page.
 */
export function getAssetDetailPath(asset: Pick<Asset, 'id' | 'isKit'>): string {
  // All assets, including kit assets, navigate to /assets/{id}
  return `/assets/${asset.id}`;
}
