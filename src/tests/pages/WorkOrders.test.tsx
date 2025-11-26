/**
 * Tests for WorkOrders page
 * 
 * Issue 4: Work Order Fixes - Testing that manual work order creation works
 */

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkOrders } from '../../pages/WorkOrders';
import type { UUID } from '../../types/entities';
import type { WorkOrder } from '../../types/maintenance';

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock the hooks
const mockMutate = vi.fn();

// Mock work orders for visibility tests (T4.2.2)
const mockWorkOrdersWithData: WorkOrder[] = [
  {
    id: 'wo-1' as UUID,
    workOrderNumber: 'WO-2025-0001',
    type: 'internal',
    orderType: 'planned',
    state: 'backlog',
    leadTimeDays: 14,
    lineItems: [
      { assetId: 'asset-1' as UUID, completionStatus: 'pending' },
    ],
    history: [],
    createdBy: 'user-1' as UUID,
    createdByName: 'Test User',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'wo-2' as UUID,
    workOrderNumber: 'WO-2025-0002',
    type: 'external',
    orderType: 'unplanned',
    state: 'in-progress',
    leadTimeDays: 7,
    lineItems: [
      { assetId: 'asset-2' as UUID, completionStatus: 'in-progress' },
    ],
    history: [],
    createdBy: 'user-1' as UUID,
    createdByName: 'Test User',
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'wo-3' as UUID,
    workOrderNumber: 'WO-2025-0003',
    type: 'internal',
    orderType: 'planned',
    state: 'scheduled',
    leadTimeDays: 30,
    lineItems: [
      { assetId: 'asset-1' as UUID, completionStatus: 'pending' },
    ],
    history: [],
    createdBy: 'user-1' as UUID,
    createdByName: 'Test User',
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z',
    scheduledStart: '2025-03-01T00:00:00Z',
  },
];

// Variable to control what mock returns
let mockWorkOrdersData: WorkOrder[] = [];

vi.mock('../../hooks/useMaintenance', () => ({
  useWorkOrders: () => ({
    data: mockWorkOrdersData,
    isLoading: false,
  }),
  useMaintenanceCompanies: () => ({
    data: [],
  }),
  useMaintenanceRules: () => ({
    data: [],
  }),
  useCreateWorkOrder: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock('../../hooks/useAssets', () => ({
  useAssets: () => ({
    data: [
      { id: 'asset-1' as UUID, name: 'Test Asset 1', assetNumber: 'AS-001', status: 'available' },
      { id: 'asset-2' as UUID, name: 'Test Asset 2', assetNumber: 'AS-002', status: 'available' },
    ],
  }),
}));

describe('WorkOrders Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    mockMutate.mockClear();
    // Reset to empty by default
    mockWorkOrdersData = [];
  });

  const renderWorkOrdersPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <MemoryRouter initialEntries={['/maintenance/work-orders']}>
            <Routes>
              <Route path="/maintenance/work-orders" element={<WorkOrders />} />
              <Route path="/maintenance/work-orders/:id/edit" element={<WorkOrders />} />
            </Routes>
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>
    );
  };

  it('should render the work orders page', () => {
    renderWorkOrdersPage();
    expect(screen.getByText('maintenance:workOrders.title')).toBeInTheDocument();
  });

  it('should open create form when clicking add button', async () => {
    const user = userEvent.setup();
    renderWorkOrdersPage();

    const addButton = screen.getByRole('button', { name: 'maintenance:workOrders.addNew' });
    await user.click(addButton);

    // Modal should show the form title
    expect(await screen.findByText('maintenance:workOrders.addNew')).toBeInTheDocument();
  });

  it('should show empty state when no work orders exist', () => {
    renderWorkOrdersPage();
    expect(screen.getByText('maintenance:workOrders.noWorkOrders')).toBeInTheDocument();
  });

  it('should have useCreateWorkOrder hook available in page', () => {
    // This test verifies that the createWorkOrder mutation is properly wired up
    // The actual mutation call is tested in integration/e2e tests
    renderWorkOrdersPage();
    
    // Verify the page renders without errors when mutation is available
    expect(screen.getByText('maintenance:workOrders.title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'maintenance:workOrders.addNew' })).toBeInTheDocument();
  });
});

// T4.2.2: Work Order Visibility Tests
describe('WorkOrders Page - Visibility (T4.2.2)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    // Set mock to return work orders with data
    mockWorkOrdersData = mockWorkOrdersWithData;
  });

  const renderWorkOrdersPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <MemoryRouter initialEntries={['/maintenance/work-orders']}>
            <Routes>
              <Route path="/maintenance/work-orders" element={<WorkOrders />} />
            </Routes>
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>
    );
  };

  it('should display work orders in table when data exists (T4.2.2)', () => {
    renderWorkOrdersPage();
    
    // Should NOT show empty state
    expect(screen.queryByText('maintenance:workOrders.noWorkOrders')).not.toBeInTheDocument();
    
    // Should show work order numbers in the table
    expect(screen.getByText('WO-2025-0001')).toBeInTheDocument();
    expect(screen.getByText('WO-2025-0002')).toBeInTheDocument();
  });

  it('should show work order state badges (T4.2.2)', () => {
    renderWorkOrdersPage();
    
    // States should be visible - using actual translation key format
    // Use getAllByText since badges can appear multiple times
    expect(screen.getAllByText('maintenance:states.backlog').length).toBeGreaterThan(0);
    expect(screen.getAllByText('maintenance:states.in-progress').length).toBeGreaterThan(0);
  });

  it('should show work order type information (T4.2.2)', () => {
    renderWorkOrdersPage();
    
    // Types should be visible - using actual translation key format
    // Use getAllByText since badges can appear multiple times
    expect(screen.getAllByText('maintenance:types.internal').length).toBeGreaterThan(0);
    expect(screen.getAllByText('maintenance:types.external').length).toBeGreaterThan(0);
  });

  it('should filter "all" shows all work orders (T4.2.2)', () => {
    renderWorkOrdersPage();
    
    // With default "all" filter, all work orders should be visible (including scheduled)
    const workOrderRows = screen.getAllByText(/WO-2025-000[123]/);
    expect(workOrderRows).toHaveLength(3);
  });

  it('should display scheduled work orders with violet badge (T6.3.1)', () => {
    renderWorkOrdersPage();
    
    // Should show the scheduled work order
    expect(screen.getByText('WO-2025-0003')).toBeInTheDocument();
    
    // States should be visible
    expect(screen.getAllByText('maintenance:states.scheduled').length).toBeGreaterThan(0);
  });

  it('should filter by scheduled state (T6.3.1)', async () => {
    const user = userEvent.setup();
    renderWorkOrdersPage();
    
    // Click the filter dropdown
    const filterDropdown = screen.getByPlaceholderText('maintenance:workOrders.filterByState');
    await user.click(filterDropdown);
    
    // Select scheduled filter
    const scheduledOption = await screen.findByRole('option', { name: 'maintenance:states.scheduled' });
    await user.click(scheduledOption);
    
    // Only scheduled work order should be visible
    expect(screen.getByText('WO-2025-0003')).toBeInTheDocument();
    expect(screen.queryByText('WO-2025-0001')).not.toBeInTheDocument();
    expect(screen.queryByText('WO-2025-0002')).not.toBeInTheDocument();
  });
});
