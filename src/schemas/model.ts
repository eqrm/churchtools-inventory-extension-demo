import { z } from 'zod';
import { isoTimestampSchema, softDeleteMetadataSchema, uuidSchema } from './base';

export const assetModelSchema = z
    .object({
        id: uuidSchema,
        name: z.string().min(1),
        assetTypeId: uuidSchema,
        manufacturer: z.string().optional(),
        modelNumber: z.string().optional(),
        defaultWarrantyMonths: z.number().int().min(0).max(120).optional(),
        defaultBookable: z.boolean().optional(),
        defaultValues: z.record(z.string(), z.unknown()),
        tagIds: z.array(uuidSchema),
        createdBy: uuidSchema,
        createdByName: z.string().optional(),
        createdAt: isoTimestampSchema,
        updatedAt: isoTimestampSchema,
    })
    .merge(softDeleteMetadataSchema.partial());

export const assetModelSummarySchema = z.object({
    id: uuidSchema,
    name: z.string().min(1),
    assetTypeId: uuidSchema,
    tagIds: z.array(uuidSchema),
});

export type AssetModelSchema = z.infer<typeof assetModelSchema>;
