import { z } from 'zod';
import { isoDateSchema, isoTimestampSchema, softDeleteMetadataSchema, uuidSchema } from './base';

export const maintenanceCompanySchema = z
    .object({
        id: uuidSchema,
        name: z.string().min(1).max(200),
        contactPerson: z.string().max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(20).optional(),
        address: z.string().optional(),
        serviceLevelAgreement: z.string().optional(),
        hourlyRate: z.number().nonnegative().max(10000).optional(),
        contractNotes: z.string().optional(),
        createdBy: uuidSchema,
        createdByName: z.string().optional(),
        createdAt: isoTimestampSchema,
        updatedAt: isoTimestampSchema,
    })
    .merge(softDeleteMetadataSchema.partial());

const maintenanceRuleTargetSchema = z.object({
    type: z.enum(['asset', 'kit', 'model', 'tag']),
    ids: z.array(uuidSchema).min(1),
});

export const maintenanceRuleSchema = z
    .object({
        id: uuidSchema,
        name: z.string().min(1).max(200),
        workType: z.string().min(1).max(100),
        isInternal: z.boolean(),
        serviceProviderId: uuidSchema.optional(),
        targets: z.array(maintenanceRuleTargetSchema).min(1),
        intervalType: z.enum(['days', 'months', 'uses']),
        intervalValue: z.number().int().positive(),
        startDate: isoDateSchema,
        nextDueDate: isoDateSchema,
        leadTimeDays: z.number().int().min(1).max(30),
        createdBy: uuidSchema,
        createdByName: z.string().optional(),
        createdAt: isoTimestampSchema,
        updatedAt: isoTimestampSchema,
    })
    .merge(softDeleteMetadataSchema.partial());

const workOrderOfferSchema = z.object({
    companyId: uuidSchema,
    amount: z.number().nonnegative(),
    receivedAt: isoTimestampSchema,
    notes: z.string().optional(),
});

const workOrderLineItemSchema = z.object({
    assetId: uuidSchema,
    completionStatus: z.enum(['pending', 'in-progress', 'completed']),
    completedAt: isoTimestampSchema.optional(),
});

const workOrderHistoryEntrySchema = z.object({
    id: uuidSchema,
    state: z.enum([
        'backlog',
        'assigned',
        'planned',
        'in-progress',
        'completed',
        'aborted',
        'obsolete',
        'done',
        'offer-requested',
        'offer-received',
    ]),
    changedAt: isoTimestampSchema,
    changedBy: uuidSchema,
    changedByName: z.string().optional(),
    notes: z.string().optional(),
});

export const workOrderSchema = z
    .object({
        id: uuidSchema,
        workOrderNumber: z.string().min(1),
        type: z.enum(['internal', 'external']),
        state: z.enum([
            'backlog',
            'assigned',
            'planned',
            'in-progress',
            'completed',
            'aborted',
            'obsolete',
            'done',
            'offer-requested',
            'offer-received',
        ]),
        ruleId: uuidSchema.optional(),
        companyId: uuidSchema.optional(),
        assignedTo: uuidSchema.optional(),
        approvalResponsibleId: uuidSchema.optional(),
        leadTimeDays: z.number().int().nonnegative(),
        scheduledStart: isoDateSchema.optional(),
        scheduledEnd: isoDateSchema.optional(),
        actualStart: isoDateSchema.optional(),
        actualEnd: isoDateSchema.optional(),
        offers: z.array(workOrderOfferSchema).optional(),
        lineItems: z.array(workOrderLineItemSchema).min(1),
        history: z.array(workOrderHistoryEntrySchema),
        createdBy: uuidSchema,
        createdByName: z.string().optional(),
        createdAt: isoTimestampSchema,
        updatedAt: isoTimestampSchema,
    })
    .merge(softDeleteMetadataSchema.partial());

export type MaintenanceCompanySchema = z.infer<typeof maintenanceCompanySchema>;
export type MaintenanceRuleSchema = z.infer<typeof maintenanceRuleSchema>;
export type WorkOrderSchema = z.infer<typeof workOrderSchema>;
