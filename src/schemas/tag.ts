import { z } from 'zod';
import { isoTimestampSchema, softDeleteMetadataSchema, uuidSchema } from './base';

export const tagSchema = z
    .object({
        id: uuidSchema,
        name: z.string().min(1),
        color: z.string().regex(/^#?[0-9a-fA-F]{6}$/u, { message: 'Expected hex color' }),
        description: z.string().optional(),
        createdBy: uuidSchema,
        createdByName: z.string().optional(),
        createdAt: isoTimestampSchema,
    })
    .merge(softDeleteMetadataSchema.partial());

export const inheritedTagSchema = z.object({
    tagId: uuidSchema,
    sourceType: z.enum(['kit', 'model']),
    sourceId: uuidSchema,
    sourceName: z.string().min(1),
});

export type TagSchema = z.infer<typeof tagSchema>;
