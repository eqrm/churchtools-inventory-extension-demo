import type { Migration } from '../types'
import type { AssetUpdate } from '../../../types/entities'
import { TARGET_SCHEMA_VERSION } from '../constants'

const SOURCE_SCHEMA_VERSION = '1.1.0'

export const schemaMigrationV1_1_0_to_v1_2_0: Migration = {
  id: 'schema-1.1.0-1.2.0',
  description: 'Ensure assets include asset group metadata defaults and upgrade to schema v1.2.0',
  fromVersion: SOURCE_SCHEMA_VERSION,
  toVersion: TARGET_SCHEMA_VERSION,
  async up({ storageProvider, log }) {
    const assets = await storageProvider.getAssets()

    for (const asset of assets) {
      const needsChildIds = !Array.isArray(asset.childAssetIds)
      const needsFieldSources = asset.fieldSources === undefined
      const needsVersionUpdate = asset.schemaVersion !== TARGET_SCHEMA_VERSION

      if (!needsChildIds && !needsFieldSources && !needsVersionUpdate) {
        continue
      }

      const update: AssetUpdate = {}
      if (needsChildIds) {
        update.childAssetIds = []
      }
      if (needsFieldSources) {
        update.fieldSources = {}
      }
      if (needsVersionUpdate) {
        update.schemaVersion = TARGET_SCHEMA_VERSION
      }

      await storageProvider.updateAsset(asset.id, update)
      log?.(`[Migration] Asset ${asset.assetNumber} updated to schema ${TARGET_SCHEMA_VERSION}`)
    }
  },
  async down({ storageProvider, log }) {
    const assets = await storageProvider.getAssets()

    for (const asset of assets) {
      if (asset.schemaVersion !== TARGET_SCHEMA_VERSION) {
        continue
      }

      const rollback: AssetUpdate = {
        schemaVersion: SOURCE_SCHEMA_VERSION,
      }

      await storageProvider.updateAsset(asset.id, rollback)
      log?.(`[Migration] Asset ${asset.assetNumber} reverted to schema ${SOURCE_SCHEMA_VERSION}`)
    }
  },
}
