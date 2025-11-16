/**
 * Bulk Operations Service
 * 
 * Provides batch processing for multiple entities with:
 * - 1000-item limit per operation
 * - Progress tracking UI
 * - Partial success handling
 * - Error reporting
 * - Rate limiting via p-queue
 */

import PQueue from 'p-queue';
import { ERROR_CODES, createError } from '../utils/errorCodes';

/**
 * Progress callback for bulk operations
 */
export interface BulkOperationProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  currentItem?: string;
}

/**
 * Result of a bulk operation
 */
export interface BulkOperationResult<T> {
  success: boolean;
  totalItems: number;
  successCount: number;
  failureCount: number;
  successfulItems: T[];
  failedItems: Array<{
    item: T;
    error: string;
  }>;
}

/**
 * Options for bulk operations
 */
export interface BulkOperationOptions {
  /** Maximum concurrent operations (default: 5) */
  concurrency?: number;
  /** Delay between operations in ms (default: 100) */
  delayMs?: number;
  /** Progress callback */
  onProgress?: (progress: BulkOperationProgress) => void;
  /** Stop on first error (default: false) */
  stopOnError?: boolean;
}

/**
 * Maximum items allowed in a single bulk operation
 */
export const MAX_BULK_ITEMS = 1000;

/**
 * Default options for bulk operations
 */
const DEFAULT_OPTIONS: Required<Omit<BulkOperationOptions, 'onProgress'>> = {
  concurrency: 5,
  delayMs: 100,
  stopOnError: false,
};

/**
 * Execute a bulk operation on an array of items
 */
export async function executeBulkOperation<TInput, TOutput>(
  items: TInput[],
  operation: (item: TInput) => Promise<TOutput>,
  options: BulkOperationOptions = {},
): Promise<BulkOperationResult<TOutput>> {
  // Validate item count
  if (items.length > MAX_BULK_ITEMS) {
    throw createError(
      ERROR_CODES.BULK_OPERATION_TOO_LARGE,
      `Bulk operation exceeds maximum of ${MAX_BULK_ITEMS} items`,
      { itemCount: items.length, maxItems: MAX_BULK_ITEMS },
    );
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const queue = new PQueue({ concurrency: opts.concurrency, interval: opts.delayMs, intervalCap: 1 });

  const result: BulkOperationResult<TOutput> = {
    success: true,
    totalItems: items.length,
    successCount: 0,
    failureCount: 0,
    successfulItems: [],
    failedItems: [],
  };

  let completed = 0;

  // Add tasks to queue
  const tasks = items.map((item) =>
    queue.add(async () => {
      try {
        // Execute operation
        const output = await operation(item);

        // Record success
        result.successfulItems.push(output);
        result.successCount++;
        completed++;

        // Report progress
        if (options.onProgress) {
          options.onProgress({
            total: items.length,
            completed,
            failed: result.failureCount,
            percentage: (completed / items.length) * 100,
          });
        }

        return output;
      } catch (error) {
        // Record failure
        result.failureCount++;
        result.success = false;
        completed++;

        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failedItems.push({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          item: item as any, // TInput might not match TOutput, but we need to track it
          error: errorMessage,
        });

        // Report progress
        if (options.onProgress) {
          options.onProgress({
            total: items.length,
            completed,
            failed: result.failureCount,
            percentage: (completed / items.length) * 100,
          });
        }

        // Stop on error if requested
        if (opts.stopOnError) {
          queue.clear();
          throw error;
        }

        return undefined;
      }
    }),
  );

  // Wait for all tasks
  await Promise.allSettled(tasks);

  return result;
}

/**
 * Execute a bulk create operation
 */
export async function bulkCreate<T>(
  items: Omit<T, 'id'>[],
  createFn: (item: Omit<T, 'id'>) => Promise<T>,
  options?: BulkOperationOptions,
): Promise<BulkOperationResult<T>> {
  return executeBulkOperation(items, createFn, options);
}

/**
 * Execute a bulk update operation
 */
export async function bulkUpdate<T extends { id: string }>(
  items: Partial<T>[],
  updateFn: (item: Partial<T>) => Promise<T>,
  options?: BulkOperationOptions,
): Promise<BulkOperationResult<T>> {
  // Validate all items have IDs
  const invalidItems = items.filter((item) => !item.id);
  if (invalidItems.length > 0) {
    throw createError(
      ERROR_CODES.BULK_OPERATION_INVALID_INPUT,
      'All items must have an id for bulk update',
      { invalidCount: invalidItems.length },
    );
  }

  return executeBulkOperation(items, updateFn, options);
}

/**
 * Execute a bulk delete operation
 */
export async function bulkDelete(
  ids: string[],
  deleteFn: (id: string) => Promise<void>,
  options?: BulkOperationOptions,
): Promise<BulkOperationResult<string>> {
  const result = await executeBulkOperation(
    ids,
    async (id) => {
      await deleteFn(id);
      return id;
    },
    options,
  );

  return result;
}

/**
 * Batch items into chunks for processing
 */
export function batchItems<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Execute operations in batches (for very large datasets)
 */
export async function executeBatchedOperation<TInput, TOutput>(
  items: TInput[],
  operation: (batch: TInput[]) => Promise<TOutput[]>,
  batchSize: number,
  options?: BulkOperationOptions,
): Promise<BulkOperationResult<TOutput>> {
  const batches = batchItems(items, batchSize);
  const allResults: TOutput[] = [];
  const allErrors: Array<{ item: TInput; error: string }> = [];

  let completedBatches = 0;

  for (const batch of batches) {
    try {
      const batchResults = await operation(batch);
      allResults.push(...batchResults);
      completedBatches++;

      if (options?.onProgress) {
        options.onProgress({
          total: items.length,
          completed: completedBatches * batchSize,
          failed: allErrors.length,
          percentage: (completedBatches / batches.length) * 100,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record all items in batch as failed
      batch.forEach((item) => {
        allErrors.push({ item, error: errorMessage });
      });

      if (options?.stopOnError) {
        break;
      }
    }
  }

  return {
    success: allErrors.length === 0,
    totalItems: items.length,
    successCount: allResults.length,
    failureCount: allErrors.length,
    successfulItems: allResults,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    failedItems: allErrors as any, // TInput may not match TOutput in batched operations
  };
}

/**
 * Retry a failed operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
