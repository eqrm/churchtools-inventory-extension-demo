/**
 * Sync metadata types
 * Feature: 002-bug-fixes-ux-improvements
 * Purpose: Track sync status and handle conflicts across persistence layers
 */

import type { UUID, ISOTimestamp } from './entities'

/**
 * Sync status for entities
 */
export type SyncStatus = 
  | 'pending'    // Changes queued for sync
  | 'syncing'    // Currently syncing with server
  | 'synced'     // Successfully synced
  | 'conflict'   // Conflict detected (local and remote changes)
  | 'error'      // Sync failed (network or validation error)

/**
 * Sync conflict information
 * Used when local changes conflict with server changes
 */
export interface SyncConflict<T = unknown> {
  id: UUID
  entityType: 'asset' | 'kit' | 'booking' | 'category' | 'person-cache'
  localData: T
  remoteData: T
  detectedAt: ISOTimestamp
  resolvedBy?: string  // Person ID who resolved conflict
  resolvedAt?: ISOTimestamp
  resolution?: 'keep-local' | 'keep-remote' | 'manual-merge'
}

/**
 * Sync queue entry for tracking pending operations
 */
export interface SyncQueueEntry {
  id: UUID
  entityType: string
  entityId: UUID
  operation: 'create' | 'update' | 'delete'
  data: unknown
  timestamp: ISOTimestamp
  retryCount: number
  lastError?: string
}
