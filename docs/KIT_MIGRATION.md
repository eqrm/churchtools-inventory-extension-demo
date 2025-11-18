# Kit to Asset Migration

This document describes how to use the migration script to convert existing Kit entities to Asset entities with `isKit: true`.

## Overview

The migration script (`src/services/migrations/migrateKitsToAssets.ts`) provides functionality to:

1. Convert all existing Kits to Assets with `isKit: true`
2. Preserve all kit-specific data (type, bound assets, pool requirements, etc.)
3. Create or use a "Kit" asset type for migrated kits
4. Update references from other assets that point to kits
5. Support dry-run mode for testing
6. Provide rollback functionality if needed

## Usage

### Basic Migration

```typescript
import { migrateKitsToAssets } from './services/migrations';
import { storageProvider } from './services/storage';

// Run the migration
const result = await migrateKitsToAssets(storageProvider);

if (result.success) {
  console.log(`✅ Successfully migrated ${result.migratedCount} kits`);
} else {
  console.error(`❌ Migration failed with ${result.errors.length} errors`);
  result.errors.forEach(err => {
    console.error(`  - Kit ${err.kitId}: ${err.error}`);
  });
}
```

### Dry Run (Test Mode)

Test the migration without making any changes:

```typescript
const result = await migrateKitsToAssets(storageProvider, {
  dryRun: true
});

console.log(`Would migrate ${result.migratedCount} kits`);
```

### Specify Asset Type

Use a specific asset type instead of creating/finding a "Kit" type:

```typescript
const result = await migrateKitsToAssets(storageProvider, {
  assetTypeId: 'your-asset-type-id-here'
});
```

### Rollback

If you need to undo the migration:

```typescript
import { rollbackKitMigration } from './services/migrations';

// You'll need the mappings from the original migration
const mappings = [
  { kitId: 'kit-1', assetId: 'asset-1' },
  { kitId: 'kit-2', assetId: 'asset-2' },
  // ...
];

await rollbackKitMigration(storageProvider, mappings);
```

## Migration Process

The migration performs these steps:

1. **Fetch all existing kits** from storage
2. **Get or create a "Kit" asset type** (or use provided asset type ID)
3. **Check for already-migrated kits** by looking for assets with matching `kitId`
4. **For each kit:**
   - Convert kit data to asset format
   - Map kit fields to asset kit fields:
     - `kit.type` → `asset.kitType`
     - `kit.boundAssets` → `asset.kitBoundAssets`
     - `kit.poolRequirements` → `asset.kitPoolRequirements`
     - `kit.inheritedProperties` → `asset.kitInheritedProperties`
     - `kit.completenessStatus` → `asset.kitCompletenessStatus`
     - `kit.assemblyDate` → `asset.kitAssemblyDate`
     - `kit.disassemblyDate` → `asset.kitDisassemblyDate`
   - Create the new asset with `isKit: true`
   - Update any assets referencing this kit to point to the new asset
5. **Store migration mappings** for future reference/rollback

## Result Object

The migration returns a `MigrationResult` object:

```typescript
{
  success: boolean,           // Overall success status
  migratedCount: number,      // Number of kits successfully migrated
  skippedCount: number,       // Number of kits skipped (already migrated)
  errors: Array<{            // Array of errors encountered
    kitId: string,
    error: string
  }>
}
```

## Important Notes

1. **Backup First**: Always backup your data before running migrations
2. **Test in Development**: Use dry-run mode first to verify the migration
3. **Check Errors**: Review any errors in the result object
4. **Update References**: The script automatically updates asset references, but review booking/maintenance records
5. **One-Time Operation**: This migration should only be run once when transitioning from Kit entities to unified Asset entities

## After Migration

Once migration is complete:

1. ✅ All kits are now visible in the asset list with a "Kit" badge
2. ✅ Kit detail pages show kit-specific information
3. ✅ Kits have QR codes and barcodes like regular assets
4. ✅ Bookings and maintenance can reference kits as assets
5. ⚠️ Old Kit routes (`/kits/*`) may need to be removed or redirected

## Example: Running Migration from Console

If you want to run the migration from the browser console:

```typescript
// Import the storage provider and migration function
const { storageProvider } = await import('./services/storage');
const { migrateKitsToAssets } = await import('./services/migrations');

// Dry run first
const dryRunResult = await migrateKitsToAssets(storageProvider, { dryRun: true });
console.log('Dry run:', dryRunResult);

// If dry run looks good, run for real
const result = await migrateKitsToAssets(storageProvider);
console.log('Migration result:', result);
```

## Troubleshooting

### "Kit asset type not found and could not be created"
The migration couldn't create a "Kit" asset type. Either:
- Provide an existing asset type ID via `assetTypeId` option
- Check storage provider permissions
- Ensure `createAssetType` is implemented

### "Asset type with ID X not found"
The provided `assetTypeId` doesn't exist. Verify the ID is correct.

### Some kits were skipped
Kits that already have corresponding assets (assets with matching `kitId`) are automatically skipped to prevent duplicates. This is normal if the migration was partially run before.

### Migration errors on specific kits
Check the `errors` array in the result for details. Common issues:
- Missing required fields
- Storage provider errors
- Network issues with ChurchTools API
