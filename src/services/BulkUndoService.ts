/**
 * T8.3.1 - Bulk Undo Service
 *
 * Provides undo functionality for bulk operations on assets.
 * Stores previous values and allows reversing bulk changes.
 *
 * Features:
 * - Stores last 10 bulk actions in memory (not persisted)
 * - Each action contains asset IDs and their previous values
 * - Supports status, location, tags, customField, and delete operations
 */

/**
 * Generate a unique ID using crypto.randomUUID or fallback
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Types of bulk operations that can be undone
 */
export type BulkUndoActionType = 'status' | 'location' | 'tags' | 'customField' | 'delete';

/**
 * Information about a single affected asset
 */
export interface AffectedAsset {
  assetId: string;
  /** Previous values before the bulk operation */
  previousValue: Record<string, unknown>;
}

/**
 * A bulk undo action entry
 */
export interface BulkUndoAction {
  id: string;
  type: BulkUndoActionType;
  description: string;
  affectedAssets: AffectedAsset[];
  timestamp: Date;
}

/**
 * Parameters for registering a new bulk undo action
 */
export type BulkUndoActionCreate = Omit<BulkUndoAction, 'id' | 'timestamp'>;

/**
 * Maximum number of bulk actions to keep in memory
 */
const MAX_STORED_ACTIONS = 10;

/**
 * Service for managing bulk undo operations
 *
 * This service maintains an in-memory store of recent bulk operations
 * and their previous values, allowing users to undo bulk changes.
 */
export class BulkUndoService {
  private actions: BulkUndoAction[] = [];

  /**
   * Register a new bulk undo action
   * @param action The action details without id and timestamp
   * @returns The generated action ID
   */
  registerBulkUndo(action: BulkUndoActionCreate): string {
    const id = generateId();
    const bulkAction: BulkUndoAction = {
      ...action,
      id,
      timestamp: new Date(),
    };

    // Add to the front of the array (most recent first)
    this.actions.unshift(bulkAction);

    // Keep only the last MAX_STORED_ACTIONS
    if (this.actions.length > MAX_STORED_ACTIONS) {
      this.actions = this.actions.slice(0, MAX_STORED_ACTIONS);
    }

    return id;
  }

  /**
   * Get a specific action by ID
   * @param id The action ID
   * @returns The action or undefined if not found
   */
  getAction(id: string): BulkUndoAction | undefined {
    return this.actions.find((action) => action.id === id);
  }

  /**
   * Get all stored actions
   * @returns Array of all bulk undo actions, most recent first
   */
  getActions(): BulkUndoAction[] {
    return [...this.actions];
  }

  /**
   * Remove an action from the store (after undo or timeout)
   * @param id The action ID to remove
   */
  removeAction(id: string): void {
    this.actions = this.actions.filter((action) => action.id !== id);
  }

  /**
   * Clear all stored actions
   */
  clear(): void {
    this.actions = [];
  }

  /**
   * Get the count of stored actions
   */
  getCount(): number {
    return this.actions.length;
  }
}

// Singleton instance for use throughout the app
let bulkUndoServiceInstance: BulkUndoService | null = null;

/**
 * Get the singleton BulkUndoService instance
 */
export function getBulkUndoService(): BulkUndoService {
  if (!bulkUndoServiceInstance) {
    bulkUndoServiceInstance = new BulkUndoService();
  }
  return bulkUndoServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetBulkUndoService(): void {
  bulkUndoServiceInstance = null;
}

/**
 * Function type for executing asset updates during undo
 */
export type BulkUndoExecutor = (
  assetId: string,
  previousValue: Record<string, unknown>,
) => Promise<void>;

/**
 * Result of a bulk undo operation
 */
export interface BulkUndoResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  failedAssets: Array<{
    assetId: string;
    error: string;
  }>;
  error?: string;
}

/**
 * Execute a bulk undo operation (T8.3.3)
 *
 * Restores all affected assets to their previous values.
 * Handles partial failures gracefully - continues with remaining assets.
 *
 * @param service The BulkUndoService instance
 * @param actionId The ID of the action to undo
 * @param updateFn Function to apply the update to each asset
 * @returns Result with success/failure counts
 */
export async function executeBulkUndo(
  service: BulkUndoService,
  actionId: string,
  updateFn: BulkUndoExecutor,
): Promise<BulkUndoResult> {
  const action = service.getAction(actionId);

  if (!action) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      failedAssets: [],
      error: 'Action not found',
    };
  }

  const result: BulkUndoResult = {
    success: true,
    successCount: 0,
    failureCount: 0,
    failedAssets: [],
  };

  // Process each affected asset
  for (const affectedAsset of action.affectedAssets) {
    try {
      await updateFn(affectedAsset.assetId, affectedAsset.previousValue);
      result.successCount++;
    } catch (error) {
      result.success = false;
      result.failureCount++;
      result.failedAssets.push({
        assetId: affectedAsset.assetId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Remove the action from the store after undo is complete
  service.removeAction(actionId);

  return result;
}
