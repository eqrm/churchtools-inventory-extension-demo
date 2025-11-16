/**
 * Undo History Entry Zod Schemas
 * 
 * Defines validation schemas for UndoHistoryEntry entities.
 * Current version: 1.0
 */

import { z } from 'zod';

/**
 * Action Type enum
 */
export const ActionTypeSchema = z.enum([
  'create',
  'update',
  'delete',
  'statusChange',
  'assign',
  'unassign',
  'addToKit',
  'removeFromKit',
  'reportDamage',
  'repairAsset',
]);

/**
 * Entity Type enum
 */
export const EntityTypeSchema = z.enum([
  'asset',
  'kit',
  'damageReport',
  'assignment',
  'assetModel',
  'savedView',
]);

/**
 * Undo History Entry Schema Version 1.0 (Initial)
 */
export const UndoHistoryEntrySchemaV1_0 = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().uuid(),
  actionType: ActionTypeSchema,
  entityType: EntityTypeSchema,
  entityId: z.string().uuid(),
  entityName: z.string(),
  previousState: z.unknown(), // JSON snapshot of entity before change
  newState: z.unknown().optional(), // JSON snapshot of entity after change (null for delete)
  timestamp: z.string(), // ISOTimestamp
  userId: z.string().uuid(),
  userName: z.string(),
  description: z.string(), // Human-readable description
  isUndone: z.boolean().default(false),
  undoneAt: z.string().optional().nullable(), // ISOTimestamp
  undoneBy: z.string().uuid().optional().nullable(),
  undoneByName: z.string().optional().nullable(),
});

/**
 * Current Undo History Entry Schema (latest version)
 */
export const UndoHistoryEntrySchema = UndoHistoryEntrySchemaV1_0;

/**
 * Type inference from current schema
 */
export type UndoHistoryEntrySchemaType = z.infer<typeof UndoHistoryEntrySchema>;

/**
 * Undo History Entry Create Schema
 */
export const UndoHistoryEntryCreateSchema = UndoHistoryEntrySchema.omit({
  id: true,
  schemaVersion: true,
  isUndone: true,
  undoneAt: true,
  undoneBy: true,
  undoneByName: true,
});

/**
 * Validate and migrate undo history entry from any version to current
 */
export function migrateUndoHistoryEntry(data: unknown): UndoHistoryEntrySchemaType {
  const result = UndoHistoryEntrySchema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  const versionCheck = z.object({ schemaVersion: z.string().optional() }).safeParse(data);
  
  if (!versionCheck.success || !versionCheck.data.schemaVersion) {
    throw new Error('UndoHistoryEntry data missing schemaVersion field');
  }
  
  const version = versionCheck.data.schemaVersion;
  throw new Error(`Unsupported undo history entry schema version: ${version}`);
}

/**
 * Get current schema version
 */
export function getCurrentUndoHistoryEntrySchemaVersion(): string {
  return '1.0';
}
