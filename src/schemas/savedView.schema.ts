/**
 * Data View Entity Zod Schemas
 * 
 * Defines validation schemas for SavedView entities across all schema versions.
 * Current version: 1.0
 */

import { z } from 'zod';

/**
 * Filter Operator enum
 */
export const FilterOperatorSchema = z.enum([
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
  'in',
  'notIn',
  'isEmpty',
  'isNotEmpty',
]);

/**
 * Filter Condition Schema
 */
export const FilterConditionSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.unknown().optional(),
});

/**
 * Sort Direction enum
 */
export const SortDirectionSchema = z.enum(['asc', 'desc']);

/**
 * Sort Configuration Schema
 */
export const SortConfigSchema = z.object({
  field: z.string(),
  direction: SortDirectionSchema,
});

/**
 * Saved View Schema Version 1.0 (Initial)
 */
export const SavedViewSchemaV1_0 = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  entityType: z.enum(['asset', 'kit', 'damageReport', 'assignment', 'workOrder']),
  filters: z.array(FilterConditionSchema),
  sort: z.array(SortConfigSchema).optional(),
  visibleColumns: z.array(z.string()).optional(),
  isDefault: z.boolean().default(false),
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
 * Current Saved View Schema (latest version)
 */
export const SavedViewSchema = SavedViewSchemaV1_0;

/**
 * Type inference from current schema
 */
export type SavedViewSchemaType = z.infer<typeof SavedViewSchema>;

/**
 * Partial Saved View Schema for updates
 */
export const SavedViewUpdateSchema = SavedViewSchema.partial().required({
  id: true,
  updatedAt: true,
});

/**
 * Saved View Create Schema
 */
export const SavedViewCreateSchema = SavedViewSchema.omit({
  id: true,
  schemaVersion: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
  deletedByName: true,
});

/**
 * Validate and migrate saved view from any version to current
 */
export function migrateSavedView(data: unknown): SavedViewSchemaType {
  const result = SavedViewSchema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  const versionCheck = z.object({ schemaVersion: z.string().optional() }).safeParse(data);
  
  if (!versionCheck.success || !versionCheck.data.schemaVersion) {
    throw new Error('SavedView data missing schemaVersion field');
  }
  
  const version = versionCheck.data.schemaVersion;
  throw new Error(`Unsupported saved view schema version: ${version}`);
}

/**
 * Get current schema version
 */
export function getCurrentSavedViewSchemaVersion(): string {
  return '1.0';
}
