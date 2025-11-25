import type { Migration } from '../types'
import type { AssetUpdate } from '../../../types/entities'
import { BASE_SCHEMA_VERSION } from '../constants'

const MIGRATION_TARGET_VERSION = '1.1.0'

export const schemaMigrationV1_0_0_to_v1_1_0: Migration = {
  id: 'schema-1.0.0-1.1.0',
  description: 'Ensure all assets include the bookable flag and upgrade schema metadata to v1.1.0',
  fromVersion: BASE_SCHEMA_VERSION,
  toVersion: MIGRATION_TARGET_VERSION,
  async up({ storageProvider, log }) {
    const assets = await storageProvider.getAssets()

    for (const asset of assets) {
      const needsBookable = asset.bookable === undefined
  const needsVersionUpdate = asset.schemaVersion !== MIGRATION_TARGET_VERSION

      if (!needsBookable && !needsVersionUpdate) {
        continue
      }

  const payload: AssetUpdate = {}
      if (needsBookable) {
        payload.bookable = true
      }
      if (needsVersionUpdate) {
        payload.schemaVersion = MIGRATION_TARGET_VERSION
      }

      await storageProvider.updateAsset(asset.id, payload)
  log?.(`[Migration] Asset ${asset.assetNumber} updated to schema ${MIGRATION_TARGET_VERSION}`)
    }
  },
  async down({ storageProvider, log }) {
    const assets = await storageProvider.getAssets()

    for (const asset of assets) {
      if (asset.schemaVersion !== MIGRATION_TARGET_VERSION) {
        continue
      }

      await storageProvider.updateAsset(asset.id, {
        schemaVersion: BASE_SCHEMA_VERSION,
        bookable: asset.bookable ?? true,
      })
      log?.(`[Migration] Asset ${asset.assetNumber} reverted to schema ${BASE_SCHEMA_VERSION}`)
    }
  },
}
