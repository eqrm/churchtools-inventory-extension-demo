/**
 * Tests for WorkOrderCalendar component (T6.3.2)
 * 
 * Tests calendar view for scheduled work orders
 */

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { WorkOrderCalendar } from '../../../components/maintenance/WorkOrderCalendar';
import type { WorkOrder } from '../../../types/maintenance';
import type { UUID } from '../../../types/entities';

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Sample work orders for testing
const createWorkOrder = (overrides: Partial<WorkOrder> = {}): WorkOrder => ({
  id: 'wo-1' as UUID,
  workOrderNumber: 'WO-2025-0001',
  type: 'internal',
  orderType: 'planned',
  state: 'scheduled',
  leadTimeDays: 14,
  lineItems: [],
  history: [],
  createdBy: 'user-1' as UUID,
  createdByName: 'Test User',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

const mockWorkOrders: WorkOrder[] = [
  createWorkOrder({
    id: 'wo-1' as UUID,
    workOrderNumber: 'WO-2025-0001',
    scheduledStart: '2025-02-15T00:00:00Z',
    state: 'scheduled',
  }),
  createWorkOrder({
    id: 'wo-2' as UUID,
    workOrderNumber: 'WO-2025-0002',
    scheduledStart: '2025-02-15T00:00:00Z', // Same date as wo-1
    state: 'scheduled',
  }),
  createWorkOrder({
    id: 'wo-3' as UUID,
    workOrderNumber: 'WO-2025-0003',
    scheduledStart: '2025-02-20T00:00:00Z',
    state: 'scheduled',
  }),
  createWorkOrder({
    id: 'wo-4' as UUID,
    workOrderNumber: 'WO-2025-0004',
    scheduledStart: '2025-03-01T00:00:00Z',
    state: 'backlog', // Not scheduled - should still be shown
  }),
];

describe('WorkOrderCalendar Component', () => {
  const renderCalendar = (workOrders: WorkOrder[] = mockWorkOrders) => {
    return render(
      <MantineProvider>
        <WorkOrderCalendar workOrders={workOrders} />
      </MantineProvider>
    );
  };

  it('should render the calendar component', () => {
    renderCalendar();
    // Calendar component should be present
    expect(screen.getByRole('application')).toBeInTheDocument();
  });

  it('should render day cells for scheduled work orders (T6.3.2)', () => {
    renderCalendar();
    
    // The calendar component renders with data-calendar attribute
    const calendar = document.querySelector('[data-calendar]');
    expect(calendar).toBeInTheDocument();
    
    // Work orders should be listed below the calendar
    expect(screen.getByText('WO-2025-0001')).toBeInTheDocument();
    expect(screen.getByText('WO-2025-0002')).toBeInTheDocument();
    expect(screen.getByText('WO-2025-0003')).toBeInTheDocument();
  });

  it('should display work orders grouped by month in list view', () => {
    renderCalendar();
    
    // Should show month groupings - check for Title elements which show months
    const titles = screen.getAllByRole('heading', { level: 4 });
    const monthTitles = titles.filter(
      (t) => t.textContent?.includes('February') || t.textContent?.includes('March')
    );
    expect(monthTitles.length).toBeGreaterThan(0);
  });

  it('should show multiple work orders on the same date', () => {
    renderCalendar();
    
    // Both work orders for Feb 15 should be present
    expect(screen.getByText('WO-2025-0001')).toBeInTheDocument();
    expect(screen.getByText('WO-2025-0002')).toBeInTheDocument();
  });

  it('should show popover with work order details on click', async () => {
    const user = userEvent.setup();
    renderCalendar();
    
    // Click on a work order
    const workOrderEntry = screen.getByText('WO-2025-0001');
    await user.click(workOrderEntry);
    
    // Popover should show details - check for View Details button
    expect(await screen.findByText('maintenance:actions.viewDetails')).toBeInTheDocument();
  });

  it('should filter to show only scheduled work orders when filter enabled', () => {
    render(
      <MantineProvider>
        <WorkOrderCalendar workOrders={mockWorkOrders} showOnlyScheduled />
      </MantineProvider>
    );
    
    // Backlog work order should not be visible
    expect(screen.queryByText('WO-2025-0004')).not.toBeInTheDocument();
    
    // Scheduled work orders should be visible
    expect(screen.getByText('WO-2025-0001')).toBeInTheDocument();
  });

  it('should handle empty work orders list', () => {
    renderCalendar([]);
    
    // Should show empty state message (as translation key)
    expect(screen.getByText('maintenance:workOrders.noScheduledWorkOrders')).toBeInTheDocument();
  });

  it('should call onWorkOrderClick when work order is clicked', async () => {
    const onWorkOrderClick = vi.fn();
    const user = userEvent.setup();
    
    render(
      <MantineProvider>
        <WorkOrderCalendar 
          workOrders={mockWorkOrders} 
          onWorkOrderClick={onWorkOrderClick}
        />
      </MantineProvider>
    );
    
    // Click on a work order
    const workOrderEntry = screen.getByText('WO-2025-0001');
    await user.click(workOrderEntry);
    
    expect(onWorkOrderClick).toHaveBeenCalledWith(expect.objectContaining({
      id: 'wo-1',
      workOrderNumber: 'WO-2025-0001',
    }));
  });

  it('should have navigation buttons for month navigation', () => {
    renderCalendar();
    
    // Should have previous and next month buttons
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument();
  });

  it('should navigate to next month when clicking next button', async () => {
    const user = userEvent.setup();
    renderCalendar();
    
    // Get initial month title
    const titles = screen.getAllByRole('heading', { level: 4 });
    const initialMonth = titles[0].textContent;
    
    // Click next month button
    const nextButton = screen.getByRole('button', { name: /next month/i });
    await user.click(nextButton);
    
    // Month should have changed
    const newTitles = screen.getAllByRole('heading', { level: 4 });
    expect(newTitles[0].textContent).not.toBe(initialMonth);
  });

  it('should navigate to previous month when clicking previous button', async () => {
    const user = userEvent.setup();
    renderCalendar();
    
    // Get initial month title
    const titles = screen.getAllByRole('heading', { level: 4 });
    const initialMonth = titles[0].textContent;
    
    // Click previous month button
    const prevButton = screen.getByRole('button', { name: /previous month/i });
    await user.click(prevButton);
    
    // Month should have changed
    const newTitles = screen.getAllByRole('heading', { level: 4 });
    expect(newTitles[0].textContent).not.toBe(initialMonth);
  });
});
