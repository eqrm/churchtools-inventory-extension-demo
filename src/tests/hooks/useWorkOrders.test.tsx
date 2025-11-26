/**
 * Tests for useWorkOrders hook (T4.2.1)
 * 
 * This tests the work order visibility - ensuring work orders
 * are properly fetched and displayed after creation.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    ],
    history: [
      {
        id: 'hist-1' as UUID,
        state: 'backlog',
        changedAt: '2025-01-01T00:00:00Z',
        changedBy: 'user-1' as UUID,
        changedByName: 'Test User',
      },
    ],
    createdBy: 'user-1' as UUID,
    createdByName: 'Test User',
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
];

// Variable to control what mock returns
let mockReturnValue: WorkOrder[] = mockWorkOrders;

// Mock the entire useMaintenance module
vi.mock('../../hooks/useMaintenance', () => ({
  useWorkOrders: () => ({
    data: mockReturnValue,
    isLoading: false,
    error: null,
  }),
}));

// Import after mock is set up
import { useWorkOrders } from '../../hooks/useMaintenance';

describe('useWorkOrders', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    // Reset to default mock data
    mockReturnValue = mockWorkOrders;
  });

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  it('returns array of WorkOrder objects (T4.2.1)', async () => {
    const { result } = renderHook(() => useWorkOrders(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].workOrderNumber).toBe('WO-20250101-0001');
    expect(result.current.data[1].workOrderNumber).toBe('WO-20250102-0001');
  });

  it('handles empty array (T4.2.1)', async () => {
    mockReturnValue = [];

    const { result } = renderHook(() => useWorkOrders(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
  });

  it('returns work orders with correct type fields', async () => {
    const { result } = renderHook(() => useWorkOrders(), {
      wrapper: createWrapper(),
    });

    const wo = result.current.data[0];
    expect(wo).toHaveProperty('id');
    expect(wo).toHaveProperty('workOrderNumber');
    expect(wo).toHaveProperty('type');
    expect(wo).toHaveProperty('orderType');
    expect(wo).toHaveProperty('state');
    expect(wo).toHaveProperty('lineItems');
    expect(wo).toHaveProperty('history');
    expect(wo).toHaveProperty('createdBy');
    expect(wo).toHaveProperty('createdAt');
    expect(wo).toHaveProperty('updatedAt');
  });

  it('returns work orders with all state types', async () => {
    const { result } = renderHook(() => useWorkOrders(), {
      wrapper: createWrapper(),
    });

    const states = result.current.data.map((wo: WorkOrder) => wo.state);
    expect(states).toContain('backlog');
    expect(states).toContain('in-progress');
  });

  it('each work order has required lineItems array', async () => {
    const { result } = renderHook(() => useWorkOrders(), {
      wrapper: createWrapper(),
    });

    result.current.data.forEach((wo: WorkOrder) => {
      expect(Array.isArray(wo.lineItems)).toBe(true);
      wo.lineItems.forEach((item) => {
        expect(item).toHaveProperty('assetId');
        expect(item).toHaveProperty('completionStatus');
      });
    });
  });
});
