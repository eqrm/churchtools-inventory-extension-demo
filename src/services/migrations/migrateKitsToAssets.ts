/**
 * Migration Script: Kits to Assets
 * 
 * Converts all existing Kit entities to Asset entities with isKit=true
 * This is a one-time migration to integrate kits into the asset system
 */

import type { IStorageProvider } from '../../types/storage';
import type { Asset, AssetCreate, AssetType } from '../../types/entities';

interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: Array<{ kitId: string; error: string }>;
  skippedCount: number;
}

interface KitToAssetMapping {
  kitId: string;
  assetId: string;
}

/**
 * Main migration function
 */
export async function migrateKitsToAssets(
  storageProvider: IStorageProvider,
  options: {
    dryRun?: boolean;
    assetTypeId?: string; // Optional: specify which asset type to use for kits
  } = {}
): Promise<MigrationResult> {
  const { dryRun = false, assetTypeId } = options;
  
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    errors: [],
    skippedCount: 0,
  };

  try {
    // eslint-disable-next-line no-console
    console.log(`[Kit Migration] Starting migration (dryRun: ${dryRun})`);

    // Get all existing kits
    const kits = await storageProvider.getKits();
    // eslint-disable-next-line no-console
    console.log(`[Kit Migration] Found ${kits.length} kits to migrate`);

    if (kits.length === 0) {
      // eslint-disable-next-line no-console
      console.log('[Kit Migration] No kits found, migration complete');
      return result;
    }

    // Get or create a "Kit" asset type
    let kitAssetType: AssetType;
    if (assetTypeId) {
      const fetchedType = await storageProvider.getAssetType(assetTypeId);
      if (!fetchedType) {
        throw new Error(`Asset type with ID ${assetTypeId} not found`);
      }
      kitAssetType = fetchedType;
    } else {
      // Use __kits__ category if it exists
      const assetTypes = await storageProvider.getAssetTypes();
      const kitsCategory = assetTypes.find(t => t.name === '__kits__');
      if (kitsCategory) {
        kitAssetType = kitsCategory;
      } else {
        kitAssetType = await getOrCreateKitAssetType(storageProvider, dryRun);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[Kit Migration] Using asset type: ${kitAssetType.name} (${kitAssetType.id})`);

    // Get all existing assets to check for duplicates
    const existingAssets = await storageProvider.getAssets();
    const existingAssetsByKitId = new Map<string, Asset>();
    
    for (const asset of existingAssets) {
      if (asset.kitId) {
        existingAssetsByKitId.set(asset.kitId, asset);
      }
    }

    // Migrate each kit
    const mappings: KitToAssetMapping[] = [];
    
    for (const kit of kits) {
      try {
        // Check if this kit was already migrated
        const existingAsset = existingAssetsByKitId.get(kit.id);
        if (existingAsset) {
          // eslint-disable-next-line no-console
          console.log(`[Kit Migration] Kit ${kit.id} already has corresponding asset ${existingAsset.id}, skipping`);
          result.skippedCount++;
          continue;
        }

        // Convert kit to asset
        const assetData: AssetCreate = {
          name: kit.name,
          description: kit.description,
          assetType: {
            id: kitAssetType.id,
            name: kitAssetType.name,
            icon: kitAssetType.icon,
          },
          status: kit.status || 'available',
          location: kit.location,
          bookable: true, // Kits are typically bookable
          isKit: true,
          kitType: kit.type,
          kitInheritedProperties: kit.inheritedProperties,
          kitCompletenessStatus: kit.completenessStatus,
          kitAssemblyDate: kit.assemblyDate,
          kitDisassemblyDate: kit.disassemblyDate,
          kitBoundAssets: kit.boundAssets,
          kitPoolRequirements: kit.poolRequirements,
          tagIds: kit.tags,
          customFieldValues: {},
          isParent: false,
          schemaVersion: kit.schemaVersion,
        };

        if (!dryRun) {
          // Create the asset
          const createdAsset = await storageProvider.createAsset(assetData);
          // eslint-disable-next-line no-console
          console.log(`[Kit Migration] Migrated kit ${kit.id} (${kit.name}) to asset ${createdAsset.id}`);
          
          mappings.push({
            kitId: kit.id,
            assetId: createdAsset.id,
          });

          // Update any assets that reference this kit
          await updateKitReferences(storageProvider, kit.id, createdAsset.id, existingAssets);
        } else {
          // eslint-disable-next-line no-console
          console.log(`[Kit Migration] [DRY RUN] Would migrate kit ${kit.id} (${kit.name})`);
        }

        result.migratedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Kit Migration] Failed to migrate kit ${kit.id}:`, errorMessage);
        result.errors.push({
          kitId: kit.id,
          error: errorMessage,
        });
        result.success = false;
      }
    }

    // Store migration mappings for reference
    if (!dryRun && mappings.length > 0) {
      await storeMigrationMappings(mappings);
    }

    // eslint-disable-next-line no-console
    console.log(`[Kit Migration] Migration complete. Migrated: ${result.migratedCount}, Skipped: ${result.skippedCount}, Errors: ${result.errors.length}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Kit Migration] Migration failed:', errorMessage);
    result.success = false;
    result.errors.push({
      kitId: 'GLOBAL',
      error: errorMessage,
    });
  }

  return result;
}

/**
 * Get or create the "Kit" asset type
 */
async function getOrCreateKitAssetType(
  storageProvider: IStorageProvider,
  dryRun: boolean
): Promise<AssetType> {
  const assetTypes = await storageProvider.getAssetTypes();
  
  // Look for existing "Kit" or "Kits" asset type
  let kitType = assetTypes.find(t => 
    t.name.toLowerCase() === 'kit' || 
    t.name.toLowerCase() === 'kits'
  );

  if (!kitType && !dryRun) {
    // eslint-disable-next-line no-console
    console.log('[Kit Migration] Creating "Kit" asset type');
    kitType = await storageProvider.createAssetType({
      name: 'Kit',
      icon: 'IconPackage',
      customFields: [],
    });
  } else if (!kitType && dryRun) {
    // Return a mock asset type for dry run
    return {
      id: 'mock-kit-type-id',
      name: 'Kit',
      icon: 'IconPackage',
      customFields: [],
      createdBy: 'system',
      createdByName: 'System',
      createdAt: new Date().toISOString(),
      lastModifiedBy: 'system',
      lastModifiedByName: 'System',
      lastModifiedAt: new Date().toISOString(),
    };
  }

  if (!kitType) {
    throw new Error('Kit asset type not found and could not be created');
  }

  return kitType;
}

/**
 * Update assets that reference a kit to now reference the migrated asset
 */
async function updateKitReferences(
  storageProvider: IStorageProvider,
  oldKitId: string,
  newAssetId: string,
  allAssets: Asset[]
): Promise<void> {
  const assetsWithKitReference = allAssets.filter(a => a.kitId === oldKitId);
  
  if (assetsWithKitReference.length === 0) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[Kit Migration] Updating ${assetsWithKitReference.length} assets that reference kit ${oldKitId}`);

  for (const asset of assetsWithKitReference) {
    try {
      // Update the asset to reference the new asset ID instead of the old kit ID
      // Note: This updates kitId to point to the migrated asset
      await storageProvider.updateAsset(asset.id, {
        kitId: newAssetId,
      });
    } catch (error) {
      console.error(`[Kit Migration] Failed to update asset ${asset.id}:`, error);
    }
  }
}

/**
 * Store migration mappings for future reference
 */
async function storeMigrationMappings(
  mappings: KitToAssetMapping[]
): Promise<void> {
  try {
    // Store mappings in a special category for historical reference
    const mappingData = {
      migratedAt: new Date().toISOString(),
      mappings,
      version: '1.0',
    };

    // eslint-disable-next-line no-console
    console.log(`[Kit Migration] Storing ${mappings.length} migration mappings`);
    
    // You could store this in a custom data category or in localStorage
    // For now, we'll just log it
    // eslint-disable-next-line no-console
    console.log('[Kit Migration] Mappings:', JSON.stringify(mappingData, null, 2));
  } catch (error) {
    console.error('[Kit Migration] Failed to store migration mappings:', error);
  }
}

/**
 * Rollback function (if needed)
 * WARNING: This will delete all migrated assets and restore kits
 */
export async function rollbackKitMigration(
  storageProvider: IStorageProvider,
  mappings: KitToAssetMapping[]
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[Kit Migration] Starting rollback of ${mappings.length} migrated kits`);

  for (const mapping of mappings) {
    try {
      // Delete the migrated asset
      const asset = await storageProvider.getAsset(mapping.assetId);
      if (asset && asset.isKit) {
        await storageProvider.deleteAsset(mapping.assetId);
        // eslint-disable-next-line no-console
        console.log(`[Kit Migration] Deleted migrated asset ${mapping.assetId} for kit ${mapping.kitId}`);
      }
    } catch (error) {
      console.error(`[Kit Migration] Failed to rollback asset ${mapping.assetId}:`, error);
    }
  }

  // eslint-disable-next-line no-console
  console.log('[Kit Migration] Rollback complete');
}
