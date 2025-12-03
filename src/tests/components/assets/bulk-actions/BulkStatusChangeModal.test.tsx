/**
 * Tests for BulkStatusChangeModal
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import '@testing-library/jest-dom/vitest';
import { BulkStatusChangeModal } from '../../../../components/assets/bulk-actions/BulkStatusChangeModal';
import type { Asset, AssetStatus } from '../../../../types/entities';

// Use vi.hoisted to define mocks that need to be accessed in tests
const { mockMutateAsync, mockNotificationsShow, mockRegisterBulkAction } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
  mockNotificationsShow: vi.fn(),
  mockRegisterBulkAction: vi.fn().mockReturnValue('mock-action-id'),
}));

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'bulkActions.changeStatusTitle': 'Change Asset Status',
        'bulkActions.changeStatusDescription': `This will update the status of ${params?.count || 0} selected assets.`,
        'bulkActions.newStatus': 'New Status',
        'bulkActions.selectStatus': 'Select status',
        'bulkActions.progress': `${params?.completed || 0} of ${params?.total || 0} completed`,
        'bulkActions.updateAssets': `Update ${params?.count || 0} Assets`,
        'bulkActions.statusChangeSuccess': 'Status Updated',
        'bulkActions.statusChangeSuccessMessage': `Successfully updated status of ${params?.count || 0} assets to ${params?.status || ''}.`,
        'bulkActions.statusChangePartialFailure': 'Partial Update',
        'bulkActions.statusChangeFailureMessage': `Failed to update ${params?.count || 0} assets.`,
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
    show: mockNotificationsShow,
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
  createMockAsset('2', 'Camera 2'),
  createMockAsset('3', 'Laptop 1', 'in-use'),
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
      <BulkStatusChangeModal {...defaultProps} {...props} />
    </MantineProvider>
  );
};

describe('BulkStatusChangeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
    mockRegisterBulkAction.mockReturnValue('mock-action-id');
  });

  describe('Rendering', () => {
    it('should render the modal when opened', () => {
      renderModal();
      expect(screen.getByText('Change Asset Status')).toBeInTheDocument();
    });

    it('should display the count of selected assets', () => {
      renderModal();
      expect(screen.getByText(/3 selected assets/i)).toBeInTheDocument();
    });

    it('should render a status select dropdown', () => {
      renderModal();
      expect(screen.getByText('New Status')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Select status')).toBeInTheDocument();
    });

    it('should render Cancel and Update buttons', () => {
      renderModal();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update 3 Assets/i })).toBeInTheDocument();
    });

    it('should not render when opened is false', () => {
      renderModal({ opened: false });
      expect(screen.queryByText('Change Asset Status')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should disable Update button when no status is selected', () => {
      renderModal();
      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      expect(updateButton).toBeDisabled();
    });

    it('should enable Update button when status is selected', async () => {
      renderModal();
      
      // Click the select to open it
      const select = screen.getByPlaceholderText('Select status');
      await userEvent.click(select);

      // Select "Available" option
      const option = await screen.findByRole('option', { name: 'Available' });
      await userEvent.click(option);

      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      expect(updateButton).not.toBeDisabled();
    });
  });

  describe('Bulk Update', () => {
    it('should call updateAsset for each selected asset', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      renderModal({ onSuccess, onClose });

      // Select status
      const select = screen.getByPlaceholderText('Select status');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Broken' });
      await userEvent.click(option);

      // Click update
      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });

      // Verify each asset was updated with the new status
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: '1', data: { status: 'broken' } });
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: '2', data: { status: 'broken' } });
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: '3', data: { status: 'broken' } });
    });

    it('should call onSuccess and onClose after successful update', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      renderModal({ onSuccess, onClose });

      // Select status and update
      const select = screen.getByPlaceholderText('Select status');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Available' });
      await userEvent.click(option);

      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      await userEvent.click(updateButton);

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
        .mockRejectedValueOnce(new Error('Update failed'));

      const onSuccess = vi.fn();
      const onClose = vi.fn();
      renderModal({ onSuccess, onClose });

      // Select status and update
      const select = screen.getByPlaceholderText('Select status');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'In Use' });
      await userEvent.click(option);

      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Undo Integration (T8.3.2)', () => {
    it('should register bulk action for undo after successful status change', async () => {
      renderModal();

      // Select status
      const select = screen.getByPlaceholderText('Select status');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Broken' });
      await userEvent.click(option);

      // Click update
      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockRegisterBulkAction).toHaveBeenCalledTimes(1);
      });

      // Verify registerBulkAction was called with correct type
      expect(mockRegisterBulkAction).toHaveBeenCalledWith(
        'status',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            assetId: '1',
            previousValue: expect.objectContaining({ status: 'available' }),
          }),
          expect.objectContaining({
            assetId: '2',
            previousValue: expect.objectContaining({ status: 'available' }),
          }),
          expect.objectContaining({
            assetId: '3',
            previousValue: expect.objectContaining({ status: 'in-use' }),
          }),
        ])
      );
    });

    it('should include previous status values for each asset', async () => {
      renderModal();

      // Select status and update
      const select = screen.getByPlaceholderText('Select status');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Available' });
      await userEvent.click(option);

      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockRegisterBulkAction).toHaveBeenCalled();
      });

      const [, , affectedAssets] = mockRegisterBulkAction.mock.calls[0];
      
      // Asset 1 and 2 had 'available', Asset 3 had 'in-use'
      expect(affectedAssets).toHaveLength(3);
      expect(affectedAssets.find((a: { assetId: string }) => a.assetId === '1')?.previousValue.status).toBe('available');
      expect(affectedAssets.find((a: { assetId: string }) => a.assetId === '3')?.previousValue.status).toBe('in-use');
    });

    it('should not register undo action when all updates fail', async () => {
      mockMutateAsync.mockRejectedValue(new Error('All failed'));

      renderModal();

      // Select status and update
      const select = screen.getByPlaceholderText('Select status');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Available' });
      await userEvent.click(option);

      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });

      // Should not register undo when no updates succeeded
      expect(mockRegisterBulkAction).not.toHaveBeenCalled();
    });
  });
});
