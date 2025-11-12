import { z } from 'zod';
import { isoTimestampSchema, uuidSchema } from './base';

export const settingsVersionSchema = z.object({
    versionId: uuidSchema,
    changeSummary: z.string().min(1),
    changedBy: uuidSchema,
    changedByName: z.string().optional(),
    createdAt: isoTimestampSchema,
    payload: z.record(z.string(), z.unknown()),
    expiresAt: isoTimestampSchema.optional(),
});

export type SettingsVersionSchema = z.infer<typeof settingsVersionSchema>;
