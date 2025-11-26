/**
 * Tests for useAssetMaintenanceStatus hook (T4.3.3)
 * 
 * TDD Red tests for overdue work order detection and maintenance status
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAssetMaintenanceStatus } from '../../hooks/useAssetMaintenanceStatus';
import type { WorkOrder } from '../../types/maintenance';

// Mock the useWorkOrders hook from useMaintenance
vi.mock('../../hooks/useMaintenance', () => ({
  useWorkOrders: vi.fn(),
}));

import { useWorkOrders } from '../../hooks/useMaintenance';

const mockedUseWorkOrders = vi.mocked(useWorkOrders);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const createWorkOrder = (overrides: Partial<WorkOrder>): WorkOrder => ({
  id: 'wo-1',
  workOrderNumber: 'WO-001',
  type: 'internal',
  orderType: 'planned',
  state: 'backlog',
  lineItems: [{ assetId: 'asset-1', completionStatus: 'pending' }],
  ruleId: undefined,
  companyId: undefined,
  offers: [],
  history: [],
  leadTimeDays: 0,
  createdBy: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('useAssetMaintenanceStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns hasOverdue true when work order is past scheduled end date', () => {
    const workOrders: WorkOrder[] = [
      createWorkOrder({
        id: 'wo-1',
        scheduledEnd: '2024-06-01', // Past date
        state: 'backlog', // Not completed
        lineItems: [{ assetId: 'asset-1', completionStatus: 'pending' }],
      }),
    ];

    mockedUseWorkOrders.mockReturnValue({
      data: workOrders,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useWorkOrders>);

    const { result } = renderHook(() => useAssetMaintenanceStatus('asset-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasOverdue).toBe(true);
    expect(result.current.overdueCount).toBe(1);
  });

  it('returns hasOverdue false when work order is completed', () => {
    const workOrders: WorkOrder[] = [
      createWorkOrder({
        id: 'wo-1',
        scheduledEnd: '2024-06-01', // Past date
        state: 'completed', // Completed state
        lineItems: [{ assetId: 'asset-1', completionStatus: 'completed' }],
      }),
    ];

    mockedUseWorkOrders.mockReturnValue({
      data: workOrders,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useWorkOrders>);

    const { result } = renderHook(() => useAssetMaintenanceStatus('asset-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasOverdue).toBe(false);
    expect(result.current.overdueCount).toBe(0);
  });

  it('returns hasOverdue false when work order is done', () => {
    const workOrders: WorkOrder[] = [
      createWorkOrder({
        id: 'wo-1',
        scheduledEnd: '2024-06-01', // Past date
        state: 'done', // Done state
        lineItems: [{ assetId: 'asset-1', completionStatus: 'completed' }],
      }),
    ];

    mockedUseWorkOrders.mockReturnValue({
      data: workOrders,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useWorkOrders>);

    const { result } = renderHook(() => useAssetMaintenanceStatus('asset-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasOverdue).toBe(false);
  });

  it('returns nextScheduled as the nearest upcoming work order date', () => {
    const workOrders: WorkOrder[] = [
      createWorkOrder({
        id: 'wo-1',
        scheduledStart: '2024-07-01', // Future
        state: 'planned',
        lineItems: [{ assetId: 'asset-1', completionStatus: 'pending' }],
      }),
      createWorkOrder({
        id: 'wo-2',
        scheduledStart: '2024-08-15', // Further future
        state: 'backlog',
        lineItems: [{ assetId: 'asset-1', completionStatus: 'pending' }],
      }),
    ];

    mockedUseWorkOrders.mockReturnValue({
      data: workOrders,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useWorkOrders>);

    const { result } = renderHook(() => useAssetMaintenanceStatus('asset-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.nextScheduled).toBe('2024-07-01');
  });

  it('returns nextScheduled as undefined when no future work orders exist', () => {
    const workOrders: WorkOrder[] = [
      createWorkOrder({
        id: 'wo-1',
        scheduledStart: '2024-05-01', // Past
        state: 'completed',
        lineItems: [{ assetId: 'asset-1', completionStatus: 'completed' }],
      }),
    ];

    mockedUseWorkOrders.mockReturnValue({
      data: workOrders,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useWorkOrders>);

    const { result } = renderHook(() => useAssetMaintenanceStatus('asset-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.nextScheduled).toBeUndefined();
  });

  it('only considers work orders containing the specified asset', () => {
    const workOrders: WorkOrder[] = [
      createWorkOrder({
        id: 'wo-1',
        scheduledEnd: '2024-06-01', // Overdue
        state: 'backlog',
        lineItems: [{ assetId: 'asset-2', completionStatus: 'pending' }], // Different asset
      }),
      createWorkOrder({
        id: 'wo-2',
        scheduledStart: '2024-07-01',
        state: 'planned',
        lineItems: [{ assetId: 'asset-1', completionStatus: 'pending' }], // Our asset
      }),
    ];

    mockedUseWorkOrders.mockReturnValue({
      data: workOrders,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useWorkOrders>);

    const { result } = renderHook(() => useAssetMaintenanceStatus('asset-1'), {
      wrapper: createWrapper(),
    });

    // Should not show overdue from asset-2's work order
    expect(result.current.hasOverdue).toBe(false);
    expect(result.current.nextScheduled).toBe('2024-07-01');
  });

  it('returns isLoading true when maintenance data is loading', () => {
    mockedUseWorkOrders.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useWorkOrders>);

    const { result } = renderHook(() => useAssetMaintenanceStatus('asset-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('counts multiple overdue work orders correctly', () => {
    const workOrders: WorkOrder[] = [
      createWorkOrder({
        id: 'wo-1',
        scheduledEnd: '2024-06-01', // Overdue
        state: 'backlog',
        lineItems: [{ assetId: 'asset-1', completionStatus: 'pending' }],
      }),
      createWorkOrder({
        id: 'wo-2',
        scheduledEnd: '2024-05-15', // Also overdue
        state: 'in-progress',
        lineItems: [{ assetId: 'asset-1', completionStatus: 'pending' }],
      }),
      createWorkOrder({
        id: 'wo-3',
        scheduledEnd: '2024-07-01', // Not overdue
        state: 'planned',
        lineItems: [{ assetId: 'asset-1', completionStatus: 'pending' }],
      }),
    ];

    mockedUseWorkOrders.mockReturnValue({
      data: workOrders,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useWorkOrders>);

    const { result } = renderHook(() => useAssetMaintenanceStatus('asset-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasOverdue).toBe(true);
    expect(result.current.overdueCount).toBe(2);
  });

  it('ignores aborted and obsolete work orders for overdue calculation', () => {
    const workOrders: WorkOrder[] = [
      createWorkOrder({
        id: 'wo-1',
        scheduledEnd: '2024-06-01', // Past
        state: 'aborted', // Should be ignored
        lineItems: [{ assetId: 'asset-1', completionStatus: 'pending' }],
      }),
      createWorkOrder({
        id: 'wo-2',
        scheduledEnd: '2024-05-15', // Past
        state: 'obsolete', // Should be ignored
        lineItems: [{ assetId: 'asset-1', completionStatus: 'pending' }],
      }),
    ];

    mockedUseWorkOrders.mockReturnValue({
      data: workOrders,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useWorkOrders>);

    const { result } = renderHook(() => useAssetMaintenanceStatus('asset-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasOverdue).toBe(false);
    expect(result.current.overdueCount).toBe(0);
  });
});
