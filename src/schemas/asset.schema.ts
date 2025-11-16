/**
 * Asset Entity Zod Schemas
 * 
 * Defines validation schemas for Asset entities across all schema versions.
 * Current version: 1.0
 */

import { z } from 'zod';

/**
 * Asset Status enum
 */
export const AssetStatusSchema = z.enum([
  'Available',
  'InUse',
  'Broken',
  'InRepair',
  'Retired',
  'Reserved',
  'Maintenance',
]);

/**
 * Asset Schema Version 1.0 (Initial)
 */
export const AssetSchemaV1_0 = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  assetTypeId: z.string(),
  status: AssetStatusSchema,
  barcode: z.string().optional(),
  modelId: z.string().uuid().optional().nullable(),
  kitId: z.string().uuid().optional().nullable(),
  location: z.string().optional(),
  purchaseDate: z.string().optional(), // ISODate
  purchasePrice: z.number().nonnegative().optional(),
  warrantyMonths: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  customFieldValues: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string().uuid()).optional(),
  inheritedTags: z.array(z.string().uuid()).optional(),
  currentAssignmentId: z.string().uuid().optional().nullable(),
  createdAt: z.string(), // ISOTimestamp
  updatedAt: z.string(), // ISOTimestamp
  createdBy: z.string().uuid(),
  createdByName: z.string(),
  updatedBy: z.string().uuid().optional(),
  updatedByName: z.string().optional(),
  deletedAt: z.string().optional().nullable(), // ISOTimestamp
  deletedBy: z.string().uuid().optional().nullable(),
  deletedByName: z.string().optional().nullable(),
});

/**
 * Current Asset Schema (latest version)
 */
export const AssetSchema = AssetSchemaV1_0;

/**
 * Type inference from current schema
 */
export type AssetSchemaType = z.infer<typeof AssetSchema>;

/**
 * Partial Asset Schema for updates
 */
export const AssetUpdateSchema = AssetSchema.partial().required({
  id: true,
  updatedAt: true,
});

/**
 * Asset Create Schema (no id, timestamps)
 */
export const AssetCreateSchema = AssetSchema.omit({
  id: true,
  schemaVersion: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
  deletedByName: true,
}).extend({
  barcode: z.string().optional(),
});

/**
 * Validate and migrate asset from any version to current
 */
export function migrateAsset(data: unknown): AssetSchemaType {
  // Parse with current schema
  const result = AssetSchema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  // If validation fails, check schema version and migrate
  const versionCheck = z.object({ schemaVersion: z.string().optional() }).safeParse(data);
  
  if (!versionCheck.success || !versionCheck.data.schemaVersion) {
    throw new Error('Asset data missing schemaVersion field');
  }
  
  const version = versionCheck.data.schemaVersion;
  
  // Future migrations would go here
  // Example:
  // if (version === '0.9') {
  //   return migrateFrom0_9To1_0(data);
  // }
  
  throw new Error(`Unsupported asset schema version: ${version}`);
}

/**
 * Get current schema version
 */
export function getCurrentAssetSchemaVersion(): string {
  return '1.0';
}
