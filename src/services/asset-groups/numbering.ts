import type { AssetGroup } from '../../types/entities'
import type { IStorageProvider } from '../../types/storage'
import { getChurchToolsStorageProvider } from '../churchTools/storageProvider'
import {
  ASSET_GROUP_BARCODE_MIN,
  ASSET_GROUP_BARCODE_PADDING,
} from './constants'

export function generateNextAssetGroupBarcode(groups: AssetGroup[]): string {
  const numericBarcodes = groups
    .map(group => {
      if (!group.barcode) {
        return null
      }

      const normalized = Number.parseInt(group.barcode, 10)
      if (!Number.isFinite(normalized)) {
        return null
      }

      return normalized
    })
    .filter((value): value is number => value !== null && value >= ASSET_GROUP_BARCODE_MIN)

  const nextBarcode = numericBarcodes.length === 0
    ? ASSET_GROUP_BARCODE_MIN
    : Math.max(...numericBarcodes) + 1

  return nextBarcode.toString().padStart(ASSET_GROUP_BARCODE_PADDING, '0')
}

export async function resolveNextAssetGroupBarcode(provider?: IStorageProvider): Promise<string> {
  const storage = provider ?? getChurchToolsStorageProvider()
  const groups = await storage.getAssetGroups()
  return generateNextAssetGroupBarcode(groups)
}
