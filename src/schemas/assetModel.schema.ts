/**
 * Asset Model Entity Zod Schemas
 * 
 * Defines validation schemas for AssetModel entities across all schema versions.
 * Current version: 1.0
 */

import { z } from 'zod';

/**
 * Asset Model Schema Version 1.0 (Initial)
 */
export const AssetModelSchemaV1_0 = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  assetTypeId: z.string(),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  description: z.string().optional(),
  defaultValues: z
    .object({
      purchasePrice: z.number().nonnegative().optional(),
      warrantyMonths: z.number().int().nonnegative().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  customFieldValues: z.record(z.string(), z.unknown()).optional(),
  defaultBookable: z.boolean().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  createdAt: z.string(), // ISOTimestamp
  updatedAt: z.string(), // ISOTimestamp
  createdBy: z.string().uuid(),
  createdByName: z.string(),
  updatedBy: z.string().uuid().optional(),
  updatedByName: z.string().optional(),
  deletedAt: z.string().optional().nullable(),
  deletedBy: z.string().uuid().optional().nullable(),
  deletedByName: z.string().optional().nullable(),
});

/**
 * Current Asset Model Schema (latest version)
 */
export const AssetModelSchema = AssetModelSchemaV1_0;

/**
 * Type inference from current schema
 */
export type AssetModelSchemaType = z.infer<typeof AssetModelSchema>;

/**
 * Partial Asset Model Schema for updates
 */
export const AssetModelUpdateSchema = AssetModelSchema.partial().required({
  id: true,
  updatedAt: true,
});

/**
 * Asset Model Create Schema
 */
export const AssetModelCreateSchema = AssetModelSchema.omit({
  id: true,
  schemaVersion: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
  deletedByName: true,
});

/**
 * Validate and migrate asset model from any version to current
 */
export function migrateAssetModel(data: unknown): AssetModelSchemaType {
  const result = AssetModelSchema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  const versionCheck = z.object({ schemaVersion: z.string().optional() }).safeParse(data);
  
  if (!versionCheck.success || !versionCheck.data.schemaVersion) {
    throw new Error('AssetModel data missing schemaVersion field');
  }
  
  const version = versionCheck.data.schemaVersion;
  throw new Error(`Unsupported asset model schema version: ${version}`);
}

/**
 * Get current schema version
 */
export function getCurrentAssetModelSchemaVersion(): string {
  return '1.0';
}
