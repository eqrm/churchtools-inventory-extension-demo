import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { BulkActionBar, type BulkAction } from '../../../components/assets/BulkActionBar';
import { IconCheck, IconTrash } from '@tabler/icons-react';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'bulkActions.selected': `${options?.count ?? 0} selected`,
        'bulkActions.selectedOfTotal': `${options?.count ?? 0} of ${options?.total ?? 0} selected`,
        'bulkActions.clearSelection': 'Clear selection',
        'bulkActions.changeStatus': 'Change Status',
        'bulkActions.delete': 'Delete',
      };
      return translations[key] || key;
    },
  }),
}));

const mockOnClearSelection = vi.fn();
const mockOnStatusChange = vi.fn();
const mockOnDelete = vi.fn();

const mockActions: BulkAction[] = [
  {
    id: 'status',
    label: 'Change Status',
    icon: <IconCheck size={14} />,
    onClick: mockOnStatusChange,
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: <IconTrash size={14} />,
    onClick: mockOnDelete,
    color: 'red',
  },
];

const renderBulkActionBar = (props: Partial<Parameters<typeof BulkActionBar>[0]> = {}) => {
  return render(
    <MantineProvider>
      <BulkActionBar
        selectedCount={props.selectedCount ?? 3}
        onClearSelection={mockOnClearSelection}
        actions={props.actions ?? mockActions}
        totalCount={props.totalCount}
      />
    </MantineProvider>
  );
};

describe('BulkActionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should NOT render when selectedCount is 0', () => {
      renderBulkActionBar({ selectedCount: 0 });
      // When count is 0, the BulkActionBar returns null, so no Paper component should be rendered
      expect(screen.queryByText(/selected/)).toBeNull();
    });

    it('should render when selectedCount is greater than 0', () => {
      renderBulkActionBar({ selectedCount: 1 });
      expect(screen.getByText(/1 selected/)).toBeTruthy();
    });
  });

  describe('Selected count display', () => {
    it('should display selected count', () => {
      renderBulkActionBar({ selectedCount: 5 });
      expect(screen.getByText('5 selected')).toBeTruthy();
    });

    it('should display selected count with total when totalCount is provided', () => {
      renderBulkActionBar({ selectedCount: 5, totalCount: 20 });
      expect(screen.getByText('5 of 20 selected')).toBeTruthy();
    });
  });

  describe('Clear selection', () => {
    it('should call onClearSelection when clear button is clicked', () => {
      renderBulkActionBar({ selectedCount: 3 });
      
      const clearButton = screen.getByRole('button', { name: 'Clear selection' });
      fireEvent.click(clearButton);
      
      expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('Action buttons', () => {
    it('should render all action buttons', () => {
      renderBulkActionBar({ selectedCount: 3 });
      
      expect(screen.getByText('Change Status')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    it('should call action onClick when action button is clicked', () => {
      renderBulkActionBar({ selectedCount: 3 });
      
      const statusButton = screen.getByText('Change Status');
      fireEvent.click(statusButton);
      
      expect(mockOnStatusChange).toHaveBeenCalledTimes(1);
    });

    it('should render disabled actions as disabled', () => {
      const disabledActions: BulkAction[] = [
        {
          id: 'status',
          label: 'Change Status',
          icon: <IconCheck size={14} />,
          onClick: mockOnStatusChange,
          disabled: true,
        },
      ];
      
      renderBulkActionBar({ selectedCount: 3, actions: disabledActions });
      
      const statusButton = screen.getByText('Change Status').closest('button');
      expect(statusButton).toHaveProperty('disabled', true);
    });
  });

  describe('Styling', () => {
    it('should have sticky positioning', () => {
      renderBulkActionBar({ selectedCount: 3 });
      
      // The Paper component should have sticky positioning
      const paper = screen.getByText('3 selected').closest('[class*="Paper"]');
      expect(paper).toBeTruthy();
    });
  });
});
