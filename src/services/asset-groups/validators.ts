import type { Asset, AssetGroup } from '../../types/entities'

export function ensureAssetCanJoinGroup(asset: Asset): void {
  if (asset.assetGroup) {
    throw new Error('Asset already belongs to an asset group')
  }
}

export function ensureAssetMatchesGroupAssetType(asset: Asset, group: AssetGroup): void {
  if (asset.assetType.id !== group.assetType.id) {
    throw new Error('Asset type does not match the target asset group type')
  }
}

export function ensurePositiveMemberCount(count: number): void {
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error('Count must be a positive number when creating group members')
  }
}
