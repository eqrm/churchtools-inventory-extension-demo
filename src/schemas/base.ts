import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const isoTimestampSchema = z.string().datetime({ offset: true });

export const isoDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, { message: 'Expected ISO date (YYYY-MM-DD)' });

export const optionalIsoTimestampSchema = isoTimestampSchema.nullable().optional();

export const optionalIsoDateSchema = isoDateSchema.nullable().optional();

export const softDeleteMetadataSchema = z.object({
    deletedAt: isoTimestampSchema.nullable().default(null),
    deletedBy: uuidSchema.nullable().default(null),
});

export type Uuid = z.infer<typeof uuidSchema>;
export type IsoTimestamp = z.infer<typeof isoTimestampSchema>;
export type IsoDate = z.infer<typeof isoDateSchema>;
