/**
 * Tests for AssetWorkOrdersList component (T4.3.2, T4.3.3)
 * 
 * Displays a list of work orders associated with a specific asset,
 * showing work order number, status, type, scheduled dates, and overdue indicators.
 */

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AssetWorkOrdersList } from '../../../components/maintenance/AssetWorkOrdersList';
import type { WorkOrder } from '../../../types/maintenance';
import type { UUID } from '../../../types/entities';

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Sample work orders for testing
const mockWorkOrders: WorkOrder[] = [
  {
    id: 'wo-1' as UUID,
    workOrderNumber: 'WO-20250101-0001',
    type: 'internal',
    orderType: 'planned',
    state: 'backlog',
    leadTimeDays: 14,
    scheduledStart: '2025-02-01',
    lineItems: [
      { assetId: 'asset-1' as UUID, completionStatus: 'pending' },
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
    state: 'completed',
    leadTimeDays: 7,
    scheduledStart: '2025-01-15',
    scheduledEnd: '2025-01-16',
    lineItems: [
      { assetId: 'asset-1' as UUID, completionStatus: 'completed' },
    ],
    history: [],
    createdBy: 'user-1' as UUID,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
];

// Overdue work orders for testing (T4.3.3)
const mockOverdueWorkOrders: WorkOrder[] = [
  {
    id: 'wo-overdue' as UUID,
    workOrderNumber: 'WO-OVERDUE',
    type: 'internal',
    orderType: 'planned',
    state: 'backlog', // Not completed
    leadTimeDays: 14,
    scheduledStart: '2024-01-01',
    scheduledEnd: '2024-01-15', // Past date
    lineItems: [
      { assetId: 'asset-1' as UUID, completionStatus: 'pending' },
    ],
    history: [],
    createdBy: 'user-1' as UUID,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// Mock the hook - will be overridden per test
const mockUseAssetWorkOrders = vi.fn();
vi.mock('../../../hooks/useAssetWorkOrders', () => ({
  useAssetWorkOrders: () => mockUseAssetWorkOrders(),
}));

describe('AssetWorkOrdersList', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderComponent = (assetId: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <MemoryRouter>
            <AssetWorkOrdersList assetId={assetId as UUID} />
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    // Default mock setup
    mockUseAssetWorkOrders.mockReturnValue({
      data: mockWorkOrders,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders work orders table with data', () => {
    renderComponent('asset-1');
    
    // Should show work order numbers
    expect(screen.getByText('WO-20250101-0001')).toBeInTheDocument();
    expect(screen.getByText('WO-20250102-0001')).toBeInTheDocument();
  });

  it('displays work order type badges', () => {
    renderComponent('asset-1');
    
    // Should show type badges
    expect(screen.getByText('maintenance:types.internal')).toBeInTheDocument();
    expect(screen.getByText('maintenance:types.external')).toBeInTheDocument();
  });

  it('displays work order state badges', () => {
    renderComponent('asset-1');
    
    // Should show state badges
    expect(screen.getByText('maintenance:states.backlog')).toBeInTheDocument();
    expect(screen.getByText('maintenance:states.completed')).toBeInTheDocument();
  });

  it('displays scheduled dates', () => {
    renderComponent('asset-1');
    
    // Dates are formatted - look for partial matches
    // Feb 1 from scheduledStart: '2025-02-01'
    // Jan 15 from scheduledStart: '2025-01-15'
    const dateElements = screen.getAllByText(/2025/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  // T4.3.3 - Overdue indicator tests
  it('shows overdue badge for past due work orders', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15')); // Set current date to June 2024
    
    mockUseAssetWorkOrders.mockReturnValue({
      data: mockOverdueWorkOrders,
      isLoading: false,
      error: null,
    });
    
    renderComponent('asset-1');
    
    // The overdue badge shows the scheduled end date in red with alert icon
    // Badge shows "15. Jan. 2024" (German format) because it displays the scheduledEnd date
    expect(screen.getByText('15. Jan. 2024')).toBeInTheDocument();
    
    // The overdue badge should be red (filled variant with red color)
    // We check for the alert-triangle icon which is only shown for overdue items
    const alertIcon = document.querySelector('.tabler-icon-alert-triangle');
    expect(alertIcon).toBeInTheDocument();
    
    vi.useRealTimers();
  });

  it('does not show overdue badge for completed work orders with past dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-01')); // Set current date after scheduledEnd
    
    const completedPastDue: WorkOrder[] = [
      {
        ...mockWorkOrders[1], // Use the completed work order
        scheduledEnd: '2025-01-16', // Past date but completed
      },
    ];
    
    mockUseAssetWorkOrders.mockReturnValue({
      data: completedPastDue,
      isLoading: false,
      error: null,
    });
    
    renderComponent('asset-1');
    
    // Should NOT show overdue badge for completed work orders
    expect(screen.queryByText('maintenance:workOrders.overdue')).not.toBeInTheDocument();
    
    vi.useRealTimers();
  });
});
