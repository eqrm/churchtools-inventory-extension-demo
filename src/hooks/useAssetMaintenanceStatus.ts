/**
 * useAssetMaintenanceStatus Hook (T4.3.3)
 * 
 * Provides maintenance status information for a specific asset:
 * - Whether the asset has overdue work orders
 * - Count of overdue work orders
 * - Next scheduled maintenance date
 */

import { useMemo } from 'react';
import { useWorkOrders } from './useMaintenance';
import type { UUID } from '../types/entities';
import type { WorkOrder, WorkOrderState } from '../types/maintenance';

export interface UseAssetMaintenanceStatusResult {
  /** Whether the asset has any overdue work orders */
  hasOverdue: boolean;
  /** Count of overdue work orders for this asset */
  overdueCount: number;
  /** Next scheduled maintenance start date (ISO string) */
  nextScheduled: string | undefined;
  /** Whether maintenance data is still loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
}

/** States that indicate a work order is "finished" and should not be counted as overdue */
const FINISHED_STATES: WorkOrderState[] = ['completed', 'done', 'aborted', 'obsolete'];

/** States that should be ignored for overdue calculations (not active work orders) */
const INACTIVE_STATES: WorkOrderState[] = ['aborted', 'obsolete'];

/**
 * Check if a work order contains a specific asset
 */
function workOrderContainsAsset(workOrder: WorkOrder, assetId: UUID): boolean {
  return workOrder.lineItems.some(item => item.assetId === assetId);
}

/**
 * Check if a work order is overdue (past scheduled end date and not completed)
 */
function isWorkOrderOverdue(workOrder: WorkOrder, now: Date): boolean {
  // Inactive work orders (aborted/obsolete) should not be considered overdue
  if (INACTIVE_STATES.includes(workOrder.state)) {
    return false;
  }
  
  // Completed/done work orders are not overdue
  if (FINISHED_STATES.includes(workOrder.state)) {
    return false;
  }
  
  // Must have a scheduled end date to be overdue
  if (!workOrder.scheduledEnd) {
    return false;
  }
  
  // Check if the scheduled end date is in the past
  const endDate = new Date(workOrder.scheduledEnd);
  return endDate < now;
}

/**
 * Check if a work order has future scheduled work (for next scheduled calculation)
 */
function hasFutureSchedule(workOrder: WorkOrder, now: Date): boolean {
  // Inactive work orders should not be counted for future scheduling
  if (INACTIVE_STATES.includes(workOrder.state)) {
    return false;
  }
  
  // Completed/done work orders don't have future work
  if (FINISHED_STATES.includes(workOrder.state)) {
    return false;
  }
  
  // Check if there's a future scheduled start date
  if (!workOrder.scheduledStart) {
    return false;
  }
  
  const startDate = new Date(workOrder.scheduledStart);
  return startDate >= now;
}

/**
 * Hook to get maintenance status for a specific asset
 */
export function useAssetMaintenanceStatus(assetId: UUID): UseAssetMaintenanceStatusResult {
  const { data: workOrders = [], isLoading, error } = useWorkOrders();
  
  const result = useMemo(() => {
    const now = new Date();
    
    // Filter to only work orders containing this asset
    const assetWorkOrders = workOrders.filter(wo => workOrderContainsAsset(wo, assetId));
    
    // Find overdue work orders
    const overdueWorkOrders = assetWorkOrders.filter(wo => isWorkOrderOverdue(wo, now));
    
    // Find next scheduled maintenance date (future work orders, sorted by date)
    const futureWorkOrders = assetWorkOrders
      .filter(wo => hasFutureSchedule(wo, now))
      .sort((a, b) => {
        // We know scheduledStart exists because hasFutureSchedule checks for it
        const dateA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
        const dateB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
        return dateA - dateB;
      });
    
    const nextScheduled = futureWorkOrders.length > 0 
      ? futureWorkOrders[0]?.scheduledStart 
      : undefined;
    
    return {
      hasOverdue: overdueWorkOrders.length > 0,
      overdueCount: overdueWorkOrders.length,
      nextScheduled,
    };
  }, [workOrders, assetId]);
  
  return {
    ...result,
    isLoading,
    error: error as Error | null,
  };
}
