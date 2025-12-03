/**
 * Tests for WorkOrderCompletionReport component (T12.4.2)
 * 
 * Requirements:
 * - List of completed work orders with dates and time to complete
 * - Columns: WO #, Asset, Type, Scheduled Date, Completed Date, Days Early/Late
 * - Filters: Date range, type (internal/external), status
 * - Export: CSV download button
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { WorkOrder } from '../../../types/maintenance';

// Mock useWorkOrders hook
const mockWorkOrders: WorkOrder[] = [
  {
    id: 'wo-1',
    workOrderNumber: 'WO-001',
    type: 'internal',
    orderType: 'planned',
    state: 'done',
    ruleId: 'rule-1',
    leadTimeDays: 7,
    scheduledStart: '2024-01-01',
    scheduledEnd: '2024-01-10',
    actualStart: '2024-01-02',
    actualEnd: '2024-01-08', // 2 days early
    lineItems: [],
    history: [],
    createdBy: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
  },
  {
    id: 'wo-2',
    workOrderNumber: 'WO-002',
    type: 'external',
    orderType: 'unplanned',
    state: 'done',
    companyId: 'company-1',
    leadTimeDays: 14,
    scheduledStart: '2024-01-15',
    scheduledEnd: '2024-01-20',
    actualStart: '2024-01-16',
    actualEnd: '2024-01-25', // 5 days late
    lineItems: [],
    history: [],
    createdBy: 'user-1',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-25T00:00:00Z',
  },
  {
    id: 'wo-3',
    workOrderNumber: 'WO-003',
    type: 'internal',
    orderType: 'planned',
    state: 'in-progress', // Not completed - should be filtered out
    leadTimeDays: 7,
    scheduledStart: '2024-02-01',
    scheduledEnd: '2024-02-10',
    lineItems: [],
    history: [],
    createdBy: 'user-1',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
];

vi.mock('../../../hooks/useMaintenance', () => ({
  useWorkOrders: () => ({
    data: mockWorkOrders,
    isLoading: false,
    error: null,
  }),
  useMaintenanceRules: () => ({
    data: [
      { id: 'rule-1', name: 'Monthly Check', assetId: 'asset-1' },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../hooks/useAssets', () => ({
  useAssets: () => ({
    data: [
      { id: 'asset-1', name: 'Test Asset 1', assetNumber: 'A001' },
      { id: 'asset-2', name: 'Test Asset 2', assetNumber: 'A002' },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Mock CSV export
vi.mock('../../../utils/exportCSV', () => ({
  exportWorkOrderCompletionToCSV: vi.fn(),
}));

// Import after mocks
import { WorkOrderCompletionReport } from '../../../components/reports/WorkOrderCompletionReport';

describe('WorkOrderCompletionReport', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  function renderReport() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <WorkOrderCompletionReport />
        </MantineProvider>
      </QueryClientProvider>
    );
  }

  describe('Report Rendering', () => {
    it('renders the report title', () => {
      renderReport();
      
      expect(screen.getByText(/work order completion/i)).toBeInTheDocument();
    });

    it('shows section title for completed work orders', () => {
      renderReport();
      
      expect(screen.getByText('Completed work orders')).toBeInTheDocument();
    });

    it('shows export button', () => {
      renderReport();
      
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
  });

  describe('Summary Statistics', () => {
    it('shows summary statistics', () => {
      renderReport();
      
      // Should show total completed - we have 2 "done" work orders
      expect(screen.getByText(/total completed/i)).toBeInTheDocument();
    });

    it('displays on-time count', () => {
      renderReport();
      
      expect(screen.getByText('On time')).toBeInTheDocument();
    });

    it('displays completed early count', () => {
      renderReport();
      
      expect(screen.getByText('Completed early')).toBeInTheDocument();
    });

    it('displays completed late count', () => {
      renderReport();
      
      expect(screen.getByText('Completed late')).toBeInTheDocument();
    });

    it('displays average days metric', () => {
      renderReport();
      
      expect(screen.getByText('Avg days (early/late)')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('exports data when export button is clicked', async () => {
      const user = userEvent.setup();
      const { exportWorkOrderCompletionToCSV } = await import('../../../utils/exportCSV');
      
      renderReport();
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);
      
      expect(exportWorkOrderCompletionToCSV).toHaveBeenCalled();
    });

    it('exports only completed work orders', async () => {
      const user = userEvent.setup();
      const { exportWorkOrderCompletionToCSV } = await import('../../../utils/exportCSV');
      
      renderReport();
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);
      
      // Should be called with only the 2 "done" work orders (not the in-progress one)
      expect(exportWorkOrderCompletionToCSV).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ workOrderNumber: 'WO-001' }),
          expect.objectContaining({ workOrderNumber: 'WO-002' }),
        ])
      );
      
      // Should NOT include the in-progress work order
      const callArg = (exportWorkOrderCompletionToCSV as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg).toHaveLength(2);
      expect(callArg.find((wo: { workOrderNumber: string }) => wo.workOrderNumber === 'WO-003')).toBeUndefined();
    });
  });
});
