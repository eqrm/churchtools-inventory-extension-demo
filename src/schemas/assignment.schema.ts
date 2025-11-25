/**
 * Assignment Entity Zod Schemas
 * 
 * Defines validation schemas for Assignment entities across all schema versions.
 * Current version: 1.0
 */

import { z } from 'zod';

/**
 * Assignment Type enum
 */
export const AssignmentTypeSchema = z.enum(['Person', 'Group', 'Department']);

/**
 * Assignment Schema Version 1.0 (Initial)
 */
export const AssignmentSchemaV1_0 = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  assignmentType: AssignmentTypeSchema,
  assigneeId: z.string(), // ChurchTools person/group ID
  assigneeName: z.string(),
  assignedDate: z.string(), // ISOTimestamp
  dueDate: z.string().optional(), // ISOTimestamp
  returnedDate: z.string().optional().nullable(), // ISOTimestamp
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
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
 * Current Assignment Schema (latest version)
 */
export const AssignmentSchema = AssignmentSchemaV1_0;

/**
 * Type inference from current schema
 */
export type AssignmentSchemaType = z.infer<typeof AssignmentSchema>;

/**
 * Partial Assignment Schema for updates
 */
export const AssignmentUpdateSchema = AssignmentSchema.partial().required({
  id: true,
  updatedAt: true,
});

/**
 * Assignment Create Schema
 */
export const AssignmentCreateSchema = AssignmentSchema.omit({
  id: true,
  schemaVersion: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
  deletedByName: true,
});

/**
 * Validate and migrate assignment from any version to current
 */
export function migrateAssignment(data: unknown): AssignmentSchemaType {
  const result = AssignmentSchema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  const versionCheck = z.object({ schemaVersion: z.string().optional() }).safeParse(data);
  
  if (!versionCheck.success || !versionCheck.data.schemaVersion) {
    throw new Error('Assignment data missing schemaVersion field');
  }
  
  const version = versionCheck.data.schemaVersion;
  throw new Error(`Unsupported assignment schema version: ${version}`);
}

/**
 * Get current schema version
 */
export function getCurrentAssignmentSchemaVersion(): string {
  return '1.0';
}
