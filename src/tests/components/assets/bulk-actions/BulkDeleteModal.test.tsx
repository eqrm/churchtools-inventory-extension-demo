/**
 * Tests for BulkDeleteModal
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import '@testing-library/jest-dom/vitest';
import { BulkDeleteModal } from '../../../../components/assets/bulk-actions/BulkDeleteModal';
import type { Asset, AssetStatus } from '../../../../types/entities';

// Use vi.hoisted to define mocks that need to be accessed in tests
const { mockMutateAsync, mockRegisterBulkAction } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
  mockRegisterBulkAction: vi.fn().mockReturnValue('mock-action-id'),
}));

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'bulkActions.deleteTitle': 'Delete Assets',
        'bulkActions.deleteDescription': `Are you sure you want to delete ${params?.count || 0} selected assets?`,
        'bulkActions.deleteWarning': 'This action can be undone using the undo function.',
        'bulkActions.deleteConfirm': `Delete ${params?.count || 0} Assets`,
        'bulkActions.progress': `${params?.completed || 0} of ${params?.total || 0} completed`,
        'bulkActions.deleteSuccess': 'Assets Deleted',
        'bulkActions.deleteSuccessMessage': `Successfully deleted ${params?.count || 0} assets.`,
        'bulkActions.deletePartialFailure': 'Partial Delete',
        'bulkActions.deleteFailureMessage': `Failed to delete ${params?.count || 0} assets.`,
        'common:actions.cancel': 'Cancel',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('../../../../hooks/useAssets', () => ({
  useUpdateAsset: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
    hide: vi.fn(),
  },
}));

// Mock useBulkUndo hook
vi.mock('../../../../hooks/useBulkUndo', () => ({
  useBulkUndo: () => ({
    registerBulkAction: mockRegisterBulkAction,
    undoAction: vi.fn(),
  }),
}));

const createMockAsset = (id: string, name: string, status: AssetStatus = 'available'): Asset => ({
  id,
  assetNumber: `A${id}`,
  name,
  status,
  createdAt: new Date().toISOString(),
  lastModifiedAt: new Date().toISOString(),
  assetType: { id: 'type-1', name: 'Camera' },
  bookable: true,
  isParent: false,
  barcode: `BC${id}`,
  qrCode: `QR${id}`,
  customFieldValues: {},
  createdBy: 'user-1',
  createdByName: 'Test User',
  lastModifiedBy: 'user-1',
  lastModifiedByName: 'Test User',
});

const mockAssets: Asset[] = [
  createMockAsset('1', 'Camera 1'),
  createMockAsset('2', 'Camera 2', 'in-use'),
  createMockAsset('3', 'Laptop 1', 'broken'),
];

const renderModal = (props = {}) => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    selectedAssets: mockAssets,
    onSuccess: vi.fn(),
  };

  return render(
    <MantineProvider>
      <BulkDeleteModal {...defaultProps} {...props} />
    </MantineProvider>
  );
};

describe('BulkDeleteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
    mockRegisterBulkAction.mockReturnValue('mock-action-id');
  });

  describe('Rendering', () => {
    it('should render the modal when opened', () => {
      renderModal();
      // The title appears in both modal header and alert, so use getAllByText
      const titles = screen.getAllByText('Delete Assets');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('should display the count of selected assets in description', () => {
      renderModal();
      expect(screen.getByText(/3 selected assets/i)).toBeInTheDocument();
    });

    it('should display the undo warning', () => {
      renderModal();
      expect(screen.getByText('This action can be undone using the undo function.')).toBeInTheDocument();
    });

    it('should render Cancel and Delete buttons', () => {
      renderModal();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete 3 Assets/i })).toBeInTheDocument();
    });

    it('should not render when opened is false', () => {
      renderModal({ opened: false });
      expect(screen.queryAllByText('Delete Assets')).toHaveLength(0);
    });
  });

  describe('Interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should have Delete button enabled by default', () => {
      renderModal();
      const deleteButton = screen.getByRole('button', { name: /Delete 3 Assets/i });
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe('Bulk Delete', () => {
    it('should call updateAsset with deleted status for each selected asset', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      renderModal({ onSuccess, onClose });

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /Delete 3 Assets/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });

      // Verify each asset was updated with deleted status
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: '1', data: { status: 'deleted' } });
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: '2', data: { status: 'deleted' } });
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: '3', data: { status: 'deleted' } });
    });

    it('should call onSuccess and onClose after successful delete', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      renderModal({ onSuccess, onClose });

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /Delete 3 Assets/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should handle partial failures gracefully', async () => {
      // First two succeed, third fails
      mockMutateAsync
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Delete failed'));

      const onClose = vi.fn();
      renderModal({ onClose });

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /Delete 3 Assets/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Undo Integration (T8.3.2)', () => {
    it('should register bulk action for undo after successful delete', async () => {
      renderModal();

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /Delete 3 Assets/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockRegisterBulkAction).toHaveBeenCalledTimes(1);
      });

      // Verify registerBulkAction was called with correct type
      expect(mockRegisterBulkAction).toHaveBeenCalledWith(
        'delete',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            assetId: '1',
            previousValue: expect.objectContaining({ status: 'available' }),
          }),
          expect.objectContaining({
            assetId: '2',
            previousValue: expect.objectContaining({ status: 'in-use' }),
          }),
          expect.objectContaining({
            assetId: '3',
            previousValue: expect.objectContaining({ status: 'broken' }),
          }),
        ])
      );
    });

    it('should include previous status values for each asset', async () => {
      renderModal();

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /Delete 3 Assets/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockRegisterBulkAction).toHaveBeenCalled();
      });

      const [, , affectedAssets] = mockRegisterBulkAction.mock.calls[0];
      
      expect(affectedAssets).toHaveLength(3);
      // Asset 1 was 'available', Asset 2 was 'in-use', Asset 3 was 'broken'
      expect(affectedAssets.find((a: { assetId: string }) => a.assetId === '1')?.previousValue.status).toBe('available');
      expect(affectedAssets.find((a: { assetId: string }) => a.assetId === '2')?.previousValue.status).toBe('in-use');
      expect(affectedAssets.find((a: { assetId: string }) => a.assetId === '3')?.previousValue.status).toBe('broken');
    });

    it('should not register undo action when all deletes fail', async () => {
      mockMutateAsync.mockRejectedValue(new Error('All failed'));

      renderModal();

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /Delete 3 Assets/i });
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });

      // Should not register undo when no deletes succeeded
      expect(mockRegisterBulkAction).not.toHaveBeenCalled();
    });
  });
});
