/**
 * Soft Delete Utilities
 * 
 * Implements soft delete pattern with 90-day retention as defined in DELETION_POLICY.md
 * All entities support soft delete instead of immediate permanent deletion
 */

import type { ISOTimestamp } from '../types/entities';

/**
 * Interface for entities that support soft delete
 */
export interface SoftDeletable {
  deletedAt?: ISOTimestamp | null;
  deletedBy?: string;
  deletedByName?: string;
}

/**
 * Mark an entity as soft deleted
 */
export function markAsDeleted<T extends SoftDeletable>(
  entity: T,
  deletedBy: string,
  deletedByName: string,
): T {
  return {
    ...entity,
    deletedAt: new Date().toISOString(),
    deletedBy,
    deletedByName,
  };
}

/**
 * Restore a soft deleted entity
 */
export function restoreDeleted<T extends SoftDeletable>(entity: T): T {
  return {
    ...entity,
    deletedAt: null,
    deletedBy: undefined,
    deletedByName: undefined,
  };
}

/**
 * Check if entity is soft deleted
 */
export function isDeleted<T extends SoftDeletable>(entity: T): boolean {
  return entity.deletedAt !== null && entity.deletedAt !== undefined;
}

/**
 * Check if entity is active (not deleted)
 */
export function isActive<T extends SoftDeletable>(entity: T): boolean {
  return !isDeleted(entity);
}

/**
 * Filter out soft deleted entities
 */
export function filterActive<T extends SoftDeletable>(entities: T[]): T[] {
  return entities.filter(isActive);
}

/**
 * Filter only soft deleted entities
 */
export function filterDeleted<T extends SoftDeletable>(entities: T[]): T[] {
  return entities.filter(isDeleted);
}

/**
 * Check if soft deleted entity should be permanently deleted (>90 days)
 */
export function shouldPermanentlyDelete<T extends SoftDeletable>(
  entity: T,
  retentionDays = 90,
): boolean {
  if (!entity.deletedAt) {
    return false;
  }

  const deletedDate = new Date(entity.deletedAt);
  const now = new Date();
  const daysSinceDeleted = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceDeleted > retentionDays;
}

/**
 * Get entities that are eligible for permanent deletion
 */
export function getExpiredDeleted<T extends SoftDeletable>(
  entities: T[],
  retentionDays = 90,
): T[] {
  return entities.filter((entity) => shouldPermanentlyDelete(entity, retentionDays));
}

/**
 * Get days remaining before permanent deletion
 */
export function getDaysUntilPermanentDeletion<T extends SoftDeletable>(
  entity: T,
  retentionDays = 90,
): number | null {
  if (!entity.deletedAt) {
    return null;
  }

  const deletedDate = new Date(entity.deletedAt);
  const now = new Date();
  const daysSinceDeleted = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysRemaining = retentionDays - daysSinceDeleted;

  return Math.max(0, Math.ceil(daysRemaining));
}

/**
 * Sort deleted entities by deletion date (oldest first)
 */
export function sortByDeletionDate<T extends SoftDeletable>(entities: T[]): T[] {
  return [...entities].sort((a, b) => {
    if (!a.deletedAt || !b.deletedAt) return 0;
    return new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime();
  });
}

/**
 * Batch mark entities as deleted
 */
export function batchMarkAsDeleted<T extends SoftDeletable>(
  entities: T[],
  deletedBy: string,
  deletedByName: string,
): T[] {
  return entities.map((entity) => markAsDeleted(entity, deletedBy, deletedByName));
}

/**
 * Batch restore entities
 */
export function batchRestore<T extends SoftDeletable>(entities: T[]): T[] {
  return entities.map(restoreDeleted);
}
