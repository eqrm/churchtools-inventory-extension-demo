import { z } from 'zod';
import { isoDateSchema, isoTimestampSchema, softDeleteMetadataSchema, uuidSchema } from './base';

const assetStatusValues = [
    'available',
    'in-use',
    'broken',
    'in-maintenance',
    'retired',
    'disposed',
    'in-repair',
    'installed',
    'sold',
    'destroyed',
    'deleted',
] as const;

export const assetStatusSchema = z.enum(assetStatusValues);

const assetTypeSchema = z.object({
    id: uuidSchema,
    name: z.string().min(1),
    icon: z.string().min(1).optional(),
});

const assetTagSourceSchema = z.object({
    tagId: uuidSchema,
    sourceType: z.enum(['kit', 'model']),
    sourceId: uuidSchema,
    sourceName: z.string().min(1),
});

const barcodeHistoryEntrySchema = z.object({
    barcode: z.string().min(1),
    generatedAt: isoTimestampSchema,
    generatedBy: z.string().min(1),
    generatedByName: z.string().min(1).optional(),
    reason: z.string().optional(),
});

const assetPhotoSchema = z.object({
    id: uuidSchema,
    url: z.string().min(1),
    thumbnailUrl: z.string().min(1).optional(),
    isMain: z.boolean(),
    uploadedAt: isoTimestampSchema,
    uploadedBy: z.string().min(1),
});

const assetAssignmentRefSchema = z.object({
    personId: z.string().min(1),
    personName: z.string().min(1),
    since: isoTimestampSchema,
});

export const assetSchema = z
    .object({
        id: uuidSchema,
        assetNumber: z.string().min(1),
        name: z.string().min(1),
        manufacturer: z.string().optional(),
        model: z.string().optional(),
        description: z.string().optional(),
        mainImage: z.string().optional(),
        assetType: assetTypeSchema,
        status: assetStatusSchema,
        location: z.string().optional(),
        kitId: uuidSchema.optional(),
        modelId: uuidSchema.optional(),
        tagIds: z.array(uuidSchema).optional(),
        inheritedTagIds: z.array(uuidSchema).optional(),
        inheritedTags: z.array(assetTagSourceSchema).optional(),
        currentAssignmentId: uuidSchema.optional(),
        inUseBy: assetAssignmentRefSchema.optional(),
        bookable: z.boolean().default(true),
        photos: z.array(assetPhotoSchema).optional(),
        isParent: z.boolean(),
        parentAssetId: uuidSchema.optional(),
        childAssetIds: z.array(uuidSchema).optional(),
        barcode: z.string().min(1),
        qrCode: z.string().min(1),
        barcodeHistory: z.array(barcodeHistoryEntrySchema).optional(),
        assetGroup: z
            .object({
                id: uuidSchema,
                groupNumber: z.string().optional(),
                name: z.string().min(1),
            })
            .optional(),
        fieldSources: z.record(z.string(), z.enum(['group', 'local', 'override'])).optional(),
        customFieldValues: z.record(z.string(), z.unknown()),
        createdBy: z.string().min(1),
        createdByName: z.string().optional(),
        createdAt: isoTimestampSchema,
        lastModifiedBy: z.string().min(1),
        lastModifiedByName: z.string().optional(),
        lastModifiedAt: isoTimestampSchema,
        schemaVersion: z.string().optional(),
        isAvailable: z.boolean().optional(),
        currentBooking: uuidSchema.optional(),
        nextMaintenance: isoDateSchema.optional(),
    })
    .merge(softDeleteMetadataSchema.partial());

export type AssetSchema = z.infer<typeof assetSchema>;
