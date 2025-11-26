/**
 * Hook to fetch work orders for a specific asset (T4.3.1)
 * 
 * Filters work orders that contain the specified asset ID in their lineItems.
 * This is useful for showing maintenance history and upcoming work on asset detail pages.
 */

import { useMemo } from 'react';
import { useWorkOrders } from './useMaintenance';
import type { UUID } from '../types/entities';
import type { WorkOrder } from '../types/maintenance';

export interface UseAssetWorkOrdersResult {
  data: WorkOrder[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Returns work orders that contain the specified asset in their lineItems
 * 
 * @param assetId - The UUID of the asset to filter by
 * @returns Object containing filtered work orders, loading state, and error
 * 
 * @example
 * ```tsx
 * const { data: workOrders, isLoading } = useAssetWorkOrders(assetId);
 * ```
 */
export function useAssetWorkOrders(assetId: UUID): UseAssetWorkOrdersResult {
  const { data: workOrders, isLoading, error } = useWorkOrders();

  const filteredWorkOrders = useMemo(() => {
    if (!workOrders || !assetId) {
      return [];
    }

    return workOrders.filter((workOrder) =>
      workOrder.lineItems.some((item) => item.assetId === assetId)
    );
  }, [workOrders, assetId]);

  return {
    data: filteredWorkOrders,
    isLoading,
    error: error as Error | null,
  };
}
