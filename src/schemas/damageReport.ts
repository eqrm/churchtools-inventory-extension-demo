import { z } from 'zod';
import { isoTimestampSchema, softDeleteMetadataSchema, uuidSchema } from './base';

const damageStatusSchema = z.enum(['broken', 'repaired']);

const damagePhotoSchema = z.object({
    id: uuidSchema,
    base64Data: z.string().min(1),
    mimeType: z.string().min(1),
    createdAt: isoTimestampSchema,
});

export const damageReportSchema = z
    .object({
        id: uuidSchema,
        assetId: uuidSchema,
        description: z.string().min(10),
        status: damageStatusSchema,
        photos: z.array(damagePhotoSchema).max(3),
        reportedBy: uuidSchema,
        reportedByName: z.string().optional(),
        reportedAt: isoTimestampSchema,
        repairedBy: uuidSchema.optional(),
        repairedByName: z.string().optional(),
        repairedAt: isoTimestampSchema.optional(),
        repairNotes: z.string().optional(),
    })
    .merge(softDeleteMetadataSchema.partial());

export type DamageReportSchema = z.infer<typeof damageReportSchema>;
