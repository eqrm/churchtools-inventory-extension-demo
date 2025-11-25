import { z } from 'zod';
import { isoTimestampSchema, uuidSchema } from './base';

export const undoActionSchema = z.object({
    actionId: uuidSchema,
    actorId: uuidSchema,
    actorName: z.string().optional(),
    entityType: z.string().min(1),
    entityId: uuidSchema,
    actionType: z.enum(['create', 'update', 'delete', 'status-change', 'compound']),
    beforeState: z.record(z.string(), z.unknown()).nullable(),
    afterState: z.record(z.string(), z.unknown()).nullable(),
    createdAt: isoTimestampSchema,
    expiresAt: isoTimestampSchema,
    undoStatus: z.enum(['pending', 'reverted']),
    createdEntityIds: z.array(uuidSchema).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export const undoHistoryFilterSchema = z.object({
    actorId: uuidSchema,
    limit: z.number().int().positive().max(50).optional(),
});

export type UndoActionSchema = z.infer<typeof undoActionSchema>;
