/**
 * Zod Schemas Export
 * 
 * Central export point for all entity validation schemas.
 */

// Asset schemas
export {
  AssetSchema,
  AssetSchemaV1_0,
  AssetUpdateSchema,
  AssetCreateSchema,
  AssetStatusSchema,
  migrateAsset,
  getCurrentAssetSchemaVersion,
  type AssetSchemaType,
} from './asset.schema';

// Kit schemas
export {
  KitSchema,
  KitSchemaV1_0,
  KitUpdateSchema,
  KitCreateSchema,
  KitItemSchema,
  migrateKit,
  getCurrentKitSchemaVersion,
  type KitSchemaType,
} from './kit.schema';

// Damage Report schemas
export {
  DamageReportSchema,
  DamageReportSchemaV1_0,
  DamageReportUpdateSchema,
  DamageReportCreateSchema,
  DamageSeveritySchema,
  RepairStatusSchema,
  migrateDamageReport,
  getCurrentDamageReportSchemaVersion,
  type DamageReportSchemaType,
} from './damageReport.schema';

// Assignment schemas
export {
  AssignmentSchema,
  AssignmentSchemaV1_0,
  AssignmentUpdateSchema,
  AssignmentCreateSchema,
  AssignmentTypeSchema,
  migrateAssignment,
  getCurrentAssignmentSchemaVersion,
  type AssignmentSchemaType,
} from './assignment.schema';

// Asset Model schemas
export {
  AssetModelSchema,
  AssetModelSchemaV1_0,
  AssetModelUpdateSchema,
  AssetModelCreateSchema,
  migrateAssetModel,
  getCurrentAssetModelSchemaVersion,
  type AssetModelSchemaType,
} from './assetModel.schema';

// Saved View schemas
export {
  SavedViewSchema,
  SavedViewSchemaV1_0,
  SavedViewUpdateSchema,
  SavedViewCreateSchema,
  FilterConditionSchema,
  FilterOperatorSchema,
  SortConfigSchema,
  SortDirectionSchema,
  migrateSavedView,
  getCurrentSavedViewSchemaVersion,
  type SavedViewSchemaType,
} from './savedView.schema';

// Undo History Entry schemas
export {
  UndoHistoryEntrySchema,
  UndoHistoryEntrySchemaV1_0,
  UndoHistoryEntryCreateSchema,
  ActionTypeSchema,
  EntityTypeSchema,
  migrateUndoHistoryEntry,
  getCurrentUndoHistoryEntrySchemaVersion,
  type UndoHistoryEntrySchemaType,
} from './undoHistoryEntry.schema';

/**
 * Get all current schema versions
 */
export function getAllSchemaVersions(): Record<string, string> {
  return {
    asset: '1.0',
    kit: '1.0',
    damageReport: '1.0',
    assignment: '1.0',
    assetModel: '1.0',
    savedView: '1.0',
    undoHistoryEntry: '1.0',
  };
}

