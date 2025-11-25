import { z } from 'zod';
import { isoTimestampSchema, uuidSchema } from './base';

const filterOperatorSchema = z.enum([
    'equals',
    'not-equals',
    'contains',
    'starts-with',
    'ends-with',
    'greater-than',
    'less-than',
    'between',
    'in',
    'not-in',
    'empty',
    'not-empty',
    'relative-date',
]);

const filterConditionSchema = z.object({
    field: z.string().min(1),
    operator: filterOperatorSchema,
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
    values: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    relativeRange: z
        .object({
            unit: z.enum(['days', 'weeks', 'months']),
            amount: z.number().int().nonnegative(),
            direction: z.enum(['past', 'future']),
        })
        .optional(),
});

const sortConfigSchema = z.object({
    field: z.string().min(1),
    direction: z.enum(['asc', 'desc']),
});

const groupingConfigSchema = z.object({
    field: z.string().min(1),
    order: z.array(z.string()).optional(),
});

export const dataViewSchema = z.object({
    id: uuidSchema,
    name: z.string().min(1),
    viewType: z.enum(['table', 'gallery', 'kanban', 'calendar']),
    filters: z.array(filterConditionSchema),
    sorts: z.array(sortConfigSchema),
    grouping: groupingConfigSchema.optional(),
    ownerId: uuidSchema,
    ownerName: z.string().optional(),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
});

export type DataViewSchema = z.infer<typeof dataViewSchema>;
