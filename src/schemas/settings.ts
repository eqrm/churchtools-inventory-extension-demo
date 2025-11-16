import { z } from 'zod';
import { isoTimestampSchema, uuidSchema } from './base';

const actorIdSchema = z.string().min(1);

const masterDataItemSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
});

const featureToggleSchema = z.object({
    bookingsEnabled: z.boolean(),
    kitsEnabled: z.boolean(),
    maintenanceEnabled: z.boolean(),
});

const scannerFunctionSchema = z.object({
    id: uuidSchema,
    name: z.string().min(1),
    description: z.string().default(''),
    configBarcode: z.string().min(1),
    category: z.enum(['prefix', 'suffix', 'formatting', 'behavior', 'other']),
});

const scannerModelSchema = z.object({
    id: uuidSchema,
    manufacturer: z.string().min(1),
    modelName: z.string().min(1),
    modelNumber: z.string().optional(),
    description: z.string().optional(),
    imageBase64: z.string().optional(),
    supportedFunctions: z.array(scannerFunctionSchema).default([]),
    createdAt: isoTimestampSchema,
    lastModifiedAt: isoTimestampSchema,
});

const masterDataSchema = z.object({
    locations: z.array(masterDataItemSchema).default([]),
    manufacturers: z.array(masterDataItemSchema).default([]),
    models: z.array(masterDataItemSchema).default([]),
    maintenanceCompanies: z.array(masterDataItemSchema).default([]),
});

export const settingsSnapshotSchema = z.object({
    schemaVersion: z.literal('1.0').default('1.0'),
    assetNumberPrefix: z.string().min(1).max(20),
    moduleDefaultPrefixId: z.string().min(1).nullable().default(null),
    featureToggles: featureToggleSchema.default({ bookingsEnabled: false, kitsEnabled: false, maintenanceEnabled: false }),
    masterData: masterDataSchema.default({
        locations: [],
        manufacturers: [],
        models: [],
        maintenanceCompanies: [],
    }),
    scannerModels: z.array(scannerModelSchema).default([]),
});

export const settingsVersionSchema = z.object({
    versionId: uuidSchema,
    versionNumber: z.number().int().min(1),
    changeSummary: z.string().min(1).max(500),
    changedBy: actorIdSchema,
    changedByName: z.string().optional(),
    createdAt: isoTimestampSchema,
    expiresAt: isoTimestampSchema.optional(),
    payload: settingsSnapshotSchema,
    origin: z.enum(['manual', 'import', 'rollback']).optional(),
    sourceVersionId: uuidSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export const settingsExportSchema = z.object({
    version: z.string().min(1),
    exportedAt: isoTimestampSchema,
    exportedBy: z.object({
        id: actorIdSchema,
        name: z.string().optional(),
    }),
    settings: settingsSnapshotSchema,
});

export type SettingsSnapshotSchema = z.infer<typeof settingsSnapshotSchema>;
export type SettingsVersionSchema = z.infer<typeof settingsVersionSchema>;
export type SettingsExportSchema = z.infer<typeof settingsExportSchema>;
