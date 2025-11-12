# Schema Versioning Requirements

**Status**: Approved  
**References**: CHK049  
**Last Updated**: 2025-01-20

## Overview

This document defines schema versioning and migration requirements for the advanced inventory system, ensuring data compatibility across application versions and smooth upgrades.

## 1. Schema Versioning Strategy

### 1.1 Version Field

All entities stored in ChurchTools custom data must include a `schemaVersion` field:

```typescript
interface VersionedEntity {
  schemaVersion: string;  // Semantic version: "1.0", "1.1", "2.0"
  // ... entity fields
}

// Example
{
  schemaVersion: "1.0",
  id: "a1b2c3d4",
  name: "Camera A",
  status: "Available",
  createdAt: "2025-01-20T10:00:00Z"
}
```

### 1.2 Semantic Versioning

Follow semantic versioning principles:

**Major version (X.0)**: Breaking changes
- Removed fields
- Changed field types (string → number)
- Changed validation rules (incompatible)
- Changed relationships (foreign key changes)

**Minor version (1.X)**: Backward-compatible additions
- New optional fields
- New enum values
- Relaxed validation rules
- New relationships (additive)

**Example Progression**:
- `1.0`: Initial schema
- `1.1`: Added optional `notes` field (backward-compatible)
- `1.2`: Added optional `barcode` field (backward-compatible)
- `2.0`: Changed `tags` from string to array (breaking change)

## 2. Schema Definition Files

### 2.1 File Structure

```
src/types/schemas/
  asset.schema.ts       # Asset entity schemas (all versions)
  kit.schema.ts         # Kit entity schemas
  damage.schema.ts      # Damage report schemas
  assignment.schema.ts  # Assignment schemas
  workOrder.schema.ts   # Work order schemas
  index.ts              # Re-export all schemas
```

### 2.2 Schema Definition with Zod

```typescript
// src/types/schemas/asset.schema.ts
import { z } from 'zod';

// Version 1.0 - Initial schema
export const AssetSchemaV1_0 = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  status: z.enum(['Available', 'InUse', 'Broken', 'InRepair', 'Retired']),
  modelId: z.string().uuid().optional(),
  location: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AssetV1_0 = z.infer<typeof AssetSchemaV1_0>;

// Version 1.1 - Added optional fields
export const AssetSchemaV1_1 = AssetSchemaV1_0.extend({
  schemaVersion: z.literal('1.1'),
  notes: z.string().optional(),          // NEW: Optional notes field
  barcode: z.string().optional(),         // NEW: Optional barcode
});

export type AssetV1_1 = z.infer<typeof AssetSchemaV1_1>;

// Version 2.0 - Breaking change (tags array)
export const AssetSchemaV2_0 = z.object({
  schemaVersion: z.literal('2.0'),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  status: z.enum(['Available', 'InUse', 'Broken', 'InRepair', 'Retired']),
  modelId: z.string().uuid().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  barcode: z.string().optional(),
  tags: z.array(z.string()),              // BREAKING: Changed from string to array
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AssetV2_0 = z.infer<typeof AssetSchemaV2_0>;

// Latest schema (alias for convenience)
export const AssetSchema = AssetSchemaV2_0;
export type Asset = AssetV2_0;

// Schema registry for runtime lookup
export const AssetSchemas = {
  '1.0': AssetSchemaV1_0,
  '1.1': AssetSchemaV1_1,
  '2.0': AssetSchemaV2_0,
} as const;

export const ASSET_LATEST_VERSION = '2.0';
```

## 3. Migration Functions

### 3.1 Migration File Structure

```
src/services/migrations/
  asset.migrations.ts       # Asset migrations
  kit.migrations.ts         # Kit migrations
  damage.migrations.ts      # Damage report migrations
  index.ts                  # Migration registry
```

### 3.2 Migration Implementation

```typescript
// src/services/migrations/asset.migrations.ts
import type { AssetV1_0, AssetV1_1, AssetV2_0 } from '@/types/schemas/asset.schema';

// Migration: 1.0 → 1.1
export function migrateAssetV1_0ToV1_1(asset: AssetV1_0): AssetV1_1 {
  return {
    ...asset,
    schemaVersion: '1.1',
    notes: undefined,      // New optional field
    barcode: undefined,    // New optional field
  };
}

// Migration: 1.1 → 2.0
export function migrateAssetV1_1ToV2_0(asset: AssetV1_1): AssetV2_0 {
  return {
    ...asset,
    schemaVersion: '2.0',
    tags: [],  // BREAKING: Initialize new required array field
  };
}

// Composite migration: 1.0 → 2.0 (skip intermediate)
export function migrateAssetV1_0ToV2_0(asset: AssetV1_0): AssetV2_0 {
  const v1_1 = migrateAssetV1_0ToV1_1(asset);
  return migrateAssetV1_1ToV2_0(v1_1);
}

// Migration registry
export const assetMigrations = {
  '1.0': {
    '1.1': migrateAssetV1_0ToV1_1,
    '2.0': migrateAssetV1_0ToV2_0,
  },
  '1.1': {
    '2.0': migrateAssetV1_1ToV2_0,
  },
} as const;
```

### 3.3 Generic Migration Runner

```typescript
// src/services/migrations/index.ts
import { assetMigrations } from './asset.migrations';
import { AssetSchemas, ASSET_LATEST_VERSION } from '@/types/schemas/asset.schema';

type MigrationRegistry = {
  [fromVersion: string]: {
    [toVersion: string]: (data: any) => any;
  };
};

export function runMigration<T>(
  data: unknown,
  targetVersion: string,
  schemas: Record<string, any>,
  migrations: MigrationRegistry
): T {
  // Detect current version by trying schemas
  let currentVersion: string | null = null;
  let validatedData: any = null;
  
  for (const [version, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(data);
    if (result.success) {
      currentVersion = version;
      validatedData = result.data;
      break;
    }
  }
  
  if (!currentVersion) {
    throw new Error('Unknown schema version - data validation failed for all versions');
  }
  
  // Already at target version
  if (currentVersion === targetVersion) {
    return validatedData as T;
  }
  
  // Find migration path
  const migration = migrations[currentVersion]?.[targetVersion];
  
  if (!migration) {
    throw new Error(
      `No migration path from version ${currentVersion} to ${targetVersion}`
    );
  }
  
  // Run migration
  console.log(`[Migration] ${currentVersion} → ${targetVersion}`);
  const migratedData = migration(validatedData);
  
  // Validate migrated data
  const targetSchema = schemas[targetVersion];
  const result = targetSchema.safeParse(migratedData);
  
  if (!result.success) {
    console.error('[Migration Error]', result.error);
    throw new Error(`Migration validation failed: ${result.error.message}`);
  }
  
  return result.data as T;
}

// Convenience wrapper for assets
export function migrateAsset(data: unknown): Asset {
  return runMigration<Asset>(
    data,
    ASSET_LATEST_VERSION,
    AssetSchemas,
    assetMigrations
  );
}
```

## 4. Runtime Migration

### 4.1 Service Layer Integration

```typescript
// src/services/assetService.ts
import { migrateAsset } from './migrations';
import type { Asset } from '@/types/schemas/asset.schema';

export class AssetService {
  async getById(id: string): Promise<Asset> {
    // Fetch from ChurchTools
    const rawData = await churchtoolsAPI.getCustomDataValue({
      categoryId: ASSET_CATEGORY_ID,
      id,
    });
    
    // Migrate to latest version
    try {
      const asset = migrateAsset(rawData);
      return asset;
    } catch (error) {
      console.error('[Asset Migration Error]', { id, error });
      throw new Error(`Failed to load asset: ${error.message}`);
    }
  }
  
  async getAll(): Promise<Asset[]> {
    const rawData = await churchtoolsAPI.getCustomDataValues({
      categoryId: ASSET_CATEGORY_ID,
    });
    
    // Migrate all assets
    const assets: Asset[] = [];
    const errors: Array<{ id: string; error: Error }> = [];
    
    for (const data of rawData) {
      try {
        const asset = migrateAsset(data);
        assets.push(asset);
      } catch (error) {
        console.error('[Asset Migration Error]', { id: data.id, error });
        errors.push({ id: data.id, error: error as Error });
      }
    }
    
    // Log summary
    if (errors.length > 0) {
      console.warn(`[Migration] ${errors.length}/${rawData.length} assets failed migration`);
    }
    
    return assets;
  }
  
  async create(data: Omit<Asset, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    const now = new Date().toISOString();
    
    const asset: Asset = {
      ...data,
      schemaVersion: ASSET_LATEST_VERSION,  // Always use latest
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    
    // Validate before saving
    const validated = AssetSchema.parse(asset);
    
    await churchtoolsAPI.createCustomDataValue({
      categoryId: ASSET_CATEGORY_ID,
      data: validated,
    });
    
    return validated;
  }
}
```

### 4.2 Batch Migration UI

For major version upgrades, show migration progress:

```tsx
// components/MigrationDialog.tsx
import { Modal, Progress, Text, Stack } from '@mantine/core';

interface MigrationDialogProps {
  opened: boolean;
  total: number;
  migrated: number;
  errors: number;
}

export function MigrationDialog({ 
  opened, 
  total, 
  migrated, 
  errors 
}: MigrationDialogProps) {
  const progress = (migrated / total) * 100;
  
  return (
    <Modal
      opened={opened}
      onClose={() => {}}  // Can't close during migration
      title="Updating Data"
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
      centered
    >
      <Stack spacing="md">
        <Text size="sm" color="dimmed">
          Migrating data to new schema version. This may take a moment...
        </Text>
        
        <Progress value={progress} size="lg" striped animate />
        
        <Text size="sm" align="center">
          {migrated} of {total} items
          {errors > 0 && (
            <Text color="red" component="span">
              {' '}({errors} errors)
            </Text>
          )}
        </Text>
      </Stack>
    </Modal>
  );
}

// Usage in App.tsx
function App() {
  const [migrationState, setMigrationState] = useState({
    inProgress: false,
    total: 0,
    migrated: 0,
    errors: 0,
  });
  
  useEffect(() => {
    async function checkMigration() {
      const needsMigration = await migrationService.checkIfNeeded();
      
      if (needsMigration) {
        setMigrationState(prev => ({ ...prev, inProgress: true }));
        
        await migrationService.runBatchMigration({
          onProgress: (total, migrated, errors) => {
            setMigrationState({ inProgress: true, total, migrated, errors });
          },
        });
        
        setMigrationState(prev => ({ ...prev, inProgress: false }));
      }
    }
    
    checkMigration();
  }, []);
  
  return (
    <>
      <MigrationDialog {...migrationState} />
      {/* Rest of app */}
    </>
  );
}
```

## 5. Testing Requirements

### 5.1 Migration Tests

```typescript
// __tests__/migrations/asset.migrations.test.ts
import { describe, test, expect } from 'vitest';
import { migrateAssetV1_0ToV1_1, migrateAssetV1_1ToV2_0 } from '@/services/migrations/asset.migrations';

describe('Asset Migrations', () => {
  test('migrates v1.0 to v1.1', () => {
    const v1_0 = {
      schemaVersion: '1.0',
      id: 'test-id',
      name: 'Test Asset',
      status: 'Available',
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: '2025-01-20T10:00:00Z',
    };
    
    const v1_1 = migrateAssetV1_0ToV1_1(v1_0);
    
    expect(v1_1).toEqual({
      ...v1_0,
      schemaVersion: '1.1',
      notes: undefined,
      barcode: undefined,
    });
  });
  
  test('migrates v1.1 to v2.0', () => {
    const v1_1 = {
      schemaVersion: '1.1',
      id: 'test-id',
      name: 'Test Asset',
      status: 'Available',
      notes: 'Test notes',
      barcode: 'ABC123',
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: '2025-01-20T10:00:00Z',
    };
    
    const v2_0 = migrateAssetV1_1ToV2_0(v1_1);
    
    expect(v2_0).toEqual({
      ...v1_1,
      schemaVersion: '2.0',
      tags: [],  // New required field initialized
    });
  });
  
  test('preserves existing data during migration', () => {
    const v1_0 = {
      schemaVersion: '1.0',
      id: 'test-id',
      name: 'Important Asset',
      status: 'Available',
      location: 'Room A',
      modelId: 'model-123',
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: '2025-01-20T10:00:00Z',
    };
    
    const v2_0 = migrateAssetV1_0ToV2_0(v1_0);
    
    expect(v2_0.name).toBe('Important Asset');
    expect(v2_0.location).toBe('Room A');
    expect(v2_0.modelId).toBe('model-123');
  });
});
```

### 5.2 Schema Validation Tests

```typescript
// __tests__/schemas/asset.schema.test.ts
import { describe, test, expect } from 'vitest';
import { AssetSchemaV1_0, AssetSchemaV2_0 } from '@/types/schemas/asset.schema';

describe('Asset Schema Validation', () => {
  test('validates v1.0 schema', () => {
    const validAsset = {
      schemaVersion: '1.0',
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Asset',
      status: 'Available',
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: '2025-01-20T10:00:00Z',
    };
    
    const result = AssetSchemaV1_0.safeParse(validAsset);
    expect(result.success).toBe(true);
  });
  
  test('rejects v1.0 with missing required fields', () => {
    const invalidAsset = {
      schemaVersion: '1.0',
      id: '123e4567-e89b-12d3-a456-426614174000',
      // Missing name
      status: 'Available',
    };
    
    const result = AssetSchemaV1_0.safeParse(invalidAsset);
    expect(result.success).toBe(false);
  });
  
  test('validates v2.0 with tags array', () => {
    const validAsset = {
      schemaVersion: '2.0',
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Asset',
      status: 'Available',
      tags: ['camera', 'lighting'],
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: '2025-01-20T10:00:00Z',
    };
    
    const result = AssetSchemaV2_0.safeParse(validAsset);
    expect(result.success).toBe(true);
  });
});
```

### 5.3 Compatibility Matrix Tests

Test all migration paths:

```typescript
test('compatibility matrix', () => {
  const testData = {
    '1.0': createTestAssetV1_0(),
    '1.1': createTestAssetV1_1(),
    '2.0': createTestAssetV2_0(),
  };
  
  const versions = ['1.0', '1.1', '2.0'];
  
  for (const fromVersion of versions) {
    for (const toVersion of versions) {
      if (fromVersion === toVersion) continue;
      
      const data = testData[fromVersion];
      
      expect(() => {
        runMigration(data, toVersion, AssetSchemas, assetMigrations);
      }).not.toThrow();
    }
  }
});
```

## 6. Version Detection

### 6.1 Automatic Version Detection

```typescript
export function detectSchemaVersion(
  data: unknown,
  schemas: Record<string, any>
): string | null {
  // Try explicit schemaVersion field first
  if (typeof data === 'object' && data !== null && 'schemaVersion' in data) {
    return (data as any).schemaVersion;
  }
  
  // Fallback: Try parsing with each schema
  for (const [version, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(data);
    if (result.success) {
      return version;
    }
  }
  
  return null;  // Unknown version
}
```

### 6.2 Migration Metadata

Store migration history in settings:

```typescript
interface MigrationMetadata {
  lastMigrationDate: string;
  migrationsRun: Array<{
    fromVersion: string;
    toVersion: string;
    timestamp: string;
    entitiesAffected: number;
    errors: number;
  }>;
}

export async function recordMigration(
  fromVersion: string,
  toVersion: string,
  stats: { total: number; errors: number }
) {
  const metadata = await settingsService.getMigrationMetadata();
  
  metadata.migrationsRun.push({
    fromVersion,
    toVersion,
    timestamp: new Date().toISOString(),
    entitiesAffected: stats.total,
    errors: stats.errors,
  });
  
  metadata.lastMigrationDate = new Date().toISOString();
  
  await settingsService.saveMigrationMetadata(metadata);
}
```

## 7. Breaking Change Strategy

### 7.1 Major Version Upgrade Process

For breaking changes (2.0 → 3.0):

1. **Pre-Migration Backup**
   - Export all data via settings export
   - Store in ChurchTools custom data with backup timestamp

2. **Migration Validation**
   - Dry-run migration on copy of data
   - Report validation errors before proceeding
   - User must acknowledge risks

3. **Execute Migration**
   - Show progress UI (MigrationDialog)
   - Log all errors for debugging
   - Rollback on critical failure

4. **Post-Migration Verification**
   - Run validation checks on migrated data
   - Generate migration report
   - Offer "Restore Backup" if issues detected

### 7.2 Rollback Mechanism

```typescript
export async function rollbackMigration(backupId: string) {
  const backup = await settingsService.getBackup(backupId);
  
  if (!backup) {
    throw new Error('Backup not found');
  }
  
  // Restore from backup
  await churchtoolsAPI.bulkReplace({
    categoryId: ASSET_CATEGORY_ID,
    data: backup.assets,
  });
  
  // Log rollback
  await recordRollback(backupId);
}
```

## 8. ESLint Rules

### 8.1 Enforce Schema Versioning

```json
// .eslintrc.json
{
  "rules": {
    "custom/require-schema-version": "error",
    "custom/require-migration-function": "error"
  }
}
```

Custom ESLint rules (pseudo-code):
- Fail if new schema version added without corresponding migration function
- Warn if schema version field missing in entity type

## 9. CI/CD Integration

### 9.1 Schema Validation Script

```bash
# scripts/validate-schemas.sh
#!/bin/bash

echo "Validating schemas and migrations..."

# Run migration tests
npm run test:migrations

# Check for missing migrations
npm run check-migrations

# Validate all schema definitions
npm run check-schemas

echo "Schema validation complete!"
```

### 9.2 GitHub Actions

```yaml
# .github/workflows/schema-validation.yml
name: Schema Validation

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run validate-schemas
```

## 10. Implementation Checklist

- [ ] Create schema definition files with Zod (all entities)
- [ ] Implement migration functions for each version
- [ ] Add `schemaVersion` field to all entities
- [ ] Integrate migrations into service layer
- [ ] Create MigrationDialog component for UI feedback
- [ ] Write migration tests (unit + compatibility matrix)
- [ ] Add version detection logic
- [ ] Implement backup/rollback mechanism
- [ ] Create ESLint rules for schema enforcement
- [ ] Add CI/CD schema validation checks
- [ ] Document migration process in developer guide

## References

- CHK049: Schema migration requirements
- Zod documentation: https://zod.dev/
- comprehensive-requirements.md
