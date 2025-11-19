/**
 * Data View Entity Zod Schemas
 * 
 * Defines validation schemas for SavedView entities across all schema versions.
 * Current version: 1.0
 */

import { z } from 'zod';

import type { LegacyViewFilter, ViewFilter, ViewFilterGroup } from '../types/entities';
import { LEGACY_SAVED_VIEW_SCHEMA_VERSION, SAVED_VIEW_SCHEMA_VERSION } from '../constants/schemaVersions';
import { convertLegacyFiltersToGroup, normalizeFilterGroup } from '../utils/viewFilters';

const FALLBACK_TIMESTAMP = '1970-01-01T00:00:00.000Z';

const FilterOperatorSchema = z.enum([
  'equals',
  'not-equals',
  'contains',
  'not-contains',
  'starts-with',
  'ends-with',
  'greater-than',
  'less-than',
  'in',
  'not-in',
  'is-empty',
  'is-not-empty',
]);

const ViewModeSchema = z.enum(['table', 'gallery', 'calendar', 'kanban', 'list']);
const FilterLogicSchema = z.enum(['AND', 'OR']);
export const SortDirectionSchema = z.enum(['asc', 'desc']);

const FilterConditionSchema = z.object({
  id: z.string(),
  type: z.literal('condition').optional(),
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.unknown().optional(),
});

const FilterGroupSchema: z.ZodType<ViewFilterGroup> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.literal('group').optional(),
    logic: FilterLogicSchema,
    children: z.array(z.union([FilterConditionSchema, FilterGroupSchema])),
  }),
);

const FilterNodeSchema: z.ZodType<ViewFilter> = z.union([FilterConditionSchema, FilterGroupSchema]);

export const SavedViewSchema = z.object({
  schemaVersion: z.literal(SAVED_VIEW_SCHEMA_VERSION),
  id: z.string(),
  name: z.string().min(1).max(100),
  ownerId: z.string(),
  ownerName: z.string(),
  isPublic: z.boolean(),
  viewMode: ViewModeSchema,
  filters: FilterGroupSchema,
  sortBy: z.string().optional(),
  sortDirection: SortDirectionSchema.optional(),
  groupBy: z.string().optional(),
  visibleColumns: z.array(z.string()).optional(),
  createdAt: z.string(),
  lastModifiedAt: z.string(),
});

export type SavedViewSchemaType = z.infer<typeof SavedViewSchema>;

export const SavedViewUpdateSchema = SavedViewSchema.partial().required({
  id: true,
  lastModifiedAt: true,
});

export const SavedViewCreateSchema = SavedViewSchema.omit({
  id: true,
  createdAt: true,
  lastModifiedAt: true,
});

const LegacyFilterSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown().optional(),
  logic: FilterLogicSchema.optional(),
});

const LegacySavedViewSchema = z.object({
  schemaVersion: z.string().optional(),
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  ownerName: z.string(),
  isPublic: z.boolean().default(false),
  viewMode: ViewModeSchema,
  filters: z.array(LegacyFilterSchema).default([]),
  sortBy: z.string().optional().nullable(),
  sortDirection: SortDirectionSchema.optional().nullable(),
  groupBy: z.string().optional().nullable(),
  visibleColumns: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  lastModifiedAt: z.string().optional(),
});

export function migrateSavedView(data: unknown): SavedViewSchemaType {
  const current = SavedViewSchema.safeParse(data);
  if (current.success) {
    return current.data;
  }

  const legacy = LegacySavedViewSchema.safeParse(data);
  if (legacy.success) {
    const { schemaVersion, filters, sortDirection, ...rest } = legacy.data;
    const normalizedFilters = convertLegacyFiltersToGroup(filters as LegacyViewFilter[]);
    return {
      ...rest,
      schemaVersion: SAVED_VIEW_SCHEMA_VERSION,
      filters: normalizeFilterGroup(normalizedFilters),
      sortDirection: sortDirection ?? undefined,
      createdAt: rest.createdAt ?? FALLBACK_TIMESTAMP,
      lastModifiedAt: rest.lastModifiedAt ?? FALLBACK_TIMESTAMP,
    } satisfies SavedViewSchemaType;
  }

  const versionLookup = z.object({ schemaVersion: z.string().optional() }).safeParse(data);
  const version = versionLookup.success ? versionLookup.data.schemaVersion : undefined;
  if (!version) {
    throw new Error('SavedView data missing schemaVersion field');
  }

  if (version === LEGACY_SAVED_VIEW_SCHEMA_VERSION) {
    throw new Error('Legacy saved view payload did not match expected shape');
  }

  throw new Error(`Unsupported saved view schema version: ${version}`);
}

export function getCurrentSavedViewSchemaVersion(): string {
  return SAVED_VIEW_SCHEMA_VERSION;
}
