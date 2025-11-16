/**
 * Kit Entity Zod Schemas
 * 
 * Defines validation schemas for Kit entities across all schema versions.
 * Current version: 1.0
 */

import { z } from 'zod';

/**
 * Kit Item Schema
 */
export const KitItemSchema = z.object({
  assetId: z.string().uuid(),
  quantity: z.number().int().positive(),
  required: z.boolean().default(true),
});

/**
 * Kit Schema Version 1.0 (Initial)
 */
export const KitSchemaV1_0 = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  items: z.array(KitItemSchema).min(1), // At least one item required
  tags: z.array(z.string().uuid()).optional(),
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
 * Current Kit Schema (latest version)
 */
export const KitSchema = KitSchemaV1_0;

/**
 * Type inference from current schema
 */
export type KitSchemaType = z.infer<typeof KitSchema>;

/**
 * Partial Kit Schema for updates
 */
export const KitUpdateSchema = KitSchema.partial().required({
  id: true,
  updatedAt: true,
});

/**
 * Kit Create Schema
 */
export const KitCreateSchema = KitSchema.omit({
  id: true,
  schemaVersion: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
  deletedByName: true,
});

/**
 * Validate and migrate kit from any version to current
 */
export function migrateKit(data: unknown): KitSchemaType {
  const result = KitSchema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  const versionCheck = z.object({ schemaVersion: z.string().optional() }).safeParse(data);
  
  if (!versionCheck.success || !versionCheck.data.schemaVersion) {
    throw new Error('Kit data missing schemaVersion field');
  }
  
  const version = versionCheck.data.schemaVersion;
  throw new Error(`Unsupported kit schema version: ${version}`);
}

/**
 * Get current schema version
 */
export function getCurrentKitSchemaVersion(): string {
  return '1.0';
}
