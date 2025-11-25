import { z } from 'zod';
import { isoTimestampSchema, uuidSchema } from './base';

export const assignmentTargetSchema = z.object({
    type: z.enum(['person', 'group']),
    id: uuidSchema,
    name: z.string().min(1),
});

export const assignmentSchema = z.object({
    id: uuidSchema,
    assetId: uuidSchema,
    target: assignmentTargetSchema,
    status: z.enum(['active', 'returned']),
    assignedBy: uuidSchema,
    assignedByName: z.string().optional(),
    assignedAt: isoTimestampSchema,
    dueAt: isoTimestampSchema.optional(),
    checkedInAt: isoTimestampSchema.optional(),
    checkedInBy: uuidSchema.optional(),
    checkedInByName: z.string().optional(),
    notes: z.string().optional(),
});

export const assignmentHistoryEntrySchema = z.object({
    id: uuidSchema,
    assetId: uuidSchema,
    target: assignmentTargetSchema,
    assignedBy: uuidSchema,
    assignedByName: z.string().optional(),
    assignedAt: isoTimestampSchema,
    checkedInAt: isoTimestampSchema.optional(),
    checkedInBy: uuidSchema.optional(),
    checkedInByName: z.string().optional(),
});

export type AssignmentSchema = z.infer<typeof assignmentSchema>;
