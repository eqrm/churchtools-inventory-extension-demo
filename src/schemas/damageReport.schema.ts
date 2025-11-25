/**
 * Damage Report Entity Zod Schemas
 * 
 * Defines validation schemas for DamageReport entities across all schema versions.
 * Current version: 1.0
 */

import { z } from 'zod';

/**
 * Damage Severity enum
 */
export const DamageSeveritySchema = z.enum(['Minor', 'Moderate', 'Major', 'Critical']);

/**
 * Repair Status enum
 */
export const RepairStatusSchema = z.enum([
  'Reported',
  'UnderReview',
  'Approved',
  'InProgress',
  'Completed',
  'Rejected',
]);

/**
 * Damage Report Schema Version 1.0 (Initial)
 */
export const DamageReportSchemaV1_0 = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  severity: DamageSeveritySchema,
  description: z.string().min(1).max(1000),
  reportedDate: z.string(), // ISOTimestamp
  photoBase64: z.string().optional(),
  repairStatus: RepairStatusSchema.default('Reported'),
  repairCost: z.number().nonnegative().optional(),
  repairNotes: z.string().optional(),
  repairedDate: z.string().optional(), // ISOTimestamp
  createdAt: z.string(), // ISOTimestamp
  updatedAt: z.string(), // ISOTimestamp
  createdBy: z.string().uuid(),
  createdByName: z.string(),
  updatedBy: z.string().uuid().optional(),
  updatedByName: z.string().optional(),
  deletedAt: z.string().optional().nullable(),
  deletedBy: z.string().uuid().optional().nullable(),
  deletedByName: z.string().optional().nullable(),
});

/**
 * Current Damage Report Schema (latest version)
 */
export const DamageReportSchema = DamageReportSchemaV1_0;

/**
 * Type inference from current schema
 */
export type DamageReportSchemaType = z.infer<typeof DamageReportSchema>;

/**
 * Partial Damage Report Schema for updates
 */
export const DamageReportUpdateSchema = DamageReportSchema.partial().required({
  id: true,
  updatedAt: true,
});

/**
 * Damage Report Create Schema
 */
export const DamageReportCreateSchema = DamageReportSchema.omit({
  id: true,
  schemaVersion: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
  deletedByName: true,
});

/**
 * Validate and migrate damage report from any version to current
 */
export function migrateDamageReport(data: unknown): DamageReportSchemaType {
  const result = DamageReportSchema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  const versionCheck = z.object({ schemaVersion: z.string().optional() }).safeParse(data);
  
  if (!versionCheck.success || !versionCheck.data.schemaVersion) {
    throw new Error('DamageReport data missing schemaVersion field');
  }
  
  const version = versionCheck.data.schemaVersion;
  throw new Error(`Unsupported damage report schema version: ${version}`);
}

/**
 * Get current schema version
 */
export function getCurrentDamageReportSchemaVersion(): string {
  return '1.0';
}
