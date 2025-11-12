import { z } from 'zod';
import { isoTimestampSchema, softDeleteMetadataSchema, uuidSchema } from './base';

export const inheritedPropertySchema = z.enum(['location', 'status', 'tags']);

const kitSubAssetSchema = z.object({
    assetId: uuidSchema,
    inheritedProperties: z
        .object({
            location: z.boolean().optional(),
            status: z.boolean().optional(),
            tags: z.boolean().optional(),
        })
        .partial()
        .optional(),
    isBroken: z.boolean().optional(),
});

export const fixedKitSchema = z
    .object({
        id: uuidSchema,
        name: z.string().min(1),
        kitNumber: z.string().optional(),
        parentAssetId: uuidSchema.optional(),
        location: z.string().optional(),
        status: z.enum(['complete', 'incomplete']),
        inheritance: z.object({
            location: z.boolean(),
            status: z.boolean(),
            tags: z.boolean(),
        }),
        subAssets: z.array(kitSubAssetSchema).min(1),
        assemblyDate: isoTimestampSchema,
        disassemblyDate: isoTimestampSchema.optional(),
        createdBy: uuidSchema,
        createdByName: z.string().optional(),
        createdAt: isoTimestampSchema,
        updatedAt: isoTimestampSchema,
        tags: z.array(uuidSchema).optional(),
    })
    .merge(softDeleteMetadataSchema.partial());

export type FixedKitSchema = z.infer<typeof fixedKitSchema>;
