/**
 * Tests for useAssetWorkOrders hook (T4.3.1)
 * 
 * This hook filters work orders by asset ID to show 
 * maintenance work orders associated with a specific asset.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssetWorkOrders } from '../../hooks/useAssetWorkOrders';
import type { WorkOrder } from '../../types/maintenance';
import type { UUID } from '../../types/entities';
import type { ReactNode } from 'react';

// Mock work orders for testing
const mockWorkOrders: WorkOrder[] = [
  {
    id: 'wo-1' as UUID,
    workOrderNumber: 'WO-20250101-0001',
    type: 'internal',
    orderType: 'planned',
    state: 'backlog',
    leadTimeDays: 14,
    lineItems: [
      { assetId: 'asset-1' as UUID, completionStatus: 'pending' },
      { assetId: 'asset-2' as UUID, completionStatus: 'pending' },
    ],
    history: [],
    createdBy: 'user-1' as UUID,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'wo-2' as UUID,
    workOrderNumber: 'WO-20250102-0001',
    type: 'external',
    orderType: 'unplanned',
    state: 'in-progress',
    leadTimeDays: 7,
    lineItems: [
      { assetId: 'asset-2' as UUID, completionStatus: 'in-progress' },
    ],
    history: [],
    createdBy: 'user-1' as UUID,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'wo-3' as UUID,
    workOrderNumber: 'WO-20250103-0001',
    type: 'internal',
    orderType: 'planned',
    state: 'completed',
    leadTimeDays: 14,
    lineItems: [
      { assetId: 'asset-3' as UUID, completionStatus: 'completed' },
    ],
    history: [],
    createdBy: 'user-1' as UUID,
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z',
  },
];

// Mock the useMaintenance hook
vi.mock('../../hooks/useMaintenance', () => ({
  useWorkOrders: vi.fn(() => ({
    data: mockWorkOrders,
    isLoading: false,
    error: null,
  })),
}));

describe('useAssetWorkOrders', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  it('returns work orders containing the specified asset ID in lineItems', async () => {
    const { result } = renderHook(() => useAssetWorkOrders('asset-1' as UUID), { 
      wrapper: createWrapper() 
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    // Asset-1 is only in WO-1
    expect(result.current.data?.[0]?.workOrderNumber).toBe('WO-20250101-0001');
  });

  it('returns multiple work orders when asset appears in multiple', async () => {
    const { result } = renderHook(() => useAssetWorkOrders('asset-2' as UUID), { 
      wrapper: createWrapper() 
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    // Asset-2 is in both WO-1 and WO-2
    const workOrderNumbers = result.current.data?.map((wo: WorkOrder) => wo.workOrderNumber);
    expect(workOrderNumbers).toContain('WO-20250101-0001');
    expect(workOrderNumbers).toContain('WO-20250102-0001');
  });

  it('returns empty array when asset has no work orders', async () => {
    const { result } = renderHook(() => useAssetWorkOrders('asset-999' as UUID), { 
      wrapper: createWrapper() 
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(0);
    });
  });
});
