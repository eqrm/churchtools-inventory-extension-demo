/**
 * Tests for BulkLocationChangeModal
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import '@testing-library/jest-dom/vitest';
import { BulkLocationChangeModal } from '../../../../components/assets/bulk-actions/BulkLocationChangeModal';
import type { Asset, AssetStatus } from '../../../../types/entities';

// Use vi.hoisted to define mocks that need to be accessed in tests
const { mockMutateAsync, mockAddLocation, mockRegisterBulkAction } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
  mockAddLocation: vi.fn(),
  mockRegisterBulkAction: vi.fn().mockReturnValue('mock-action-id'),
}));

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'bulkActions.changeLocationTitle': 'Change Asset Location',
        'bulkActions.changeLocationDescription': `This will update the location of ${params?.count || 0} selected assets.`,
        'bulkActions.newLocation': 'New Location',
        'bulkActions.selectLocation': 'Select location',
        'bulkActions.progress': `${params?.completed || 0} of ${params?.total || 0} completed`,
        'bulkActions.updateAssets': `Update ${params?.count || 0} Assets`,
        'bulkActions.locationChangeSuccess': 'Location Updated',
        'bulkActions.locationChangeSuccessMessage': `Successfully moved ${params?.count || 0} assets to new location.`,
        'bulkActions.locationChangePartialFailure': 'Partial Update',
        'bulkActions.locationChangeFailureMessage': `Failed to move ${params?.count || 0} assets.`,
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

vi.mock('../../../../hooks/useMasterDataNames', () => ({
  useMasterData: () => ({
    names: ['Warehouse A', 'Warehouse B', 'Office'],
    items: [
      { id: '1', name: 'Warehouse A' },
      { id: '2', name: 'Warehouse B' },
      { id: '3', name: 'Office' },
    ],
    addItem: mockAddLocation,
    isLoading: false,
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

const createMockAsset = (id: string, name: string, location?: string): Asset => ({
  id,
  assetNumber: `A${id}`,
  name,
  status: 'available' as AssetStatus,
  location,
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
  createMockAsset('1', 'Camera 1', 'Warehouse A'),
  createMockAsset('2', 'Camera 2', 'Warehouse A'),
  createMockAsset('3', 'Laptop 1', 'Office'),
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
      <BulkLocationChangeModal {...defaultProps} {...props} />
    </MantineProvider>
  );
};

describe('BulkLocationChangeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
    mockAddLocation.mockResolvedValue({ id: 'new-1', name: 'New Location' });
    mockRegisterBulkAction.mockReturnValue('mock-action-id');
  });

  describe('Rendering', () => {
    it('should render the modal when opened', () => {
      renderModal();
      expect(screen.getByText('Change Asset Location')).toBeInTheDocument();
    });

    it('should display the count of selected assets', () => {
      renderModal();
      expect(screen.getByText(/3 selected assets/i)).toBeInTheDocument();
    });

    it('should render a location select dropdown', () => {
      renderModal();
      expect(screen.getByText('New Location')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Select location')).toBeInTheDocument();
    });

    it('should render Cancel and Update buttons', () => {
      renderModal();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update 3 Assets/i })).toBeInTheDocument();
    });

    it('should not render when opened is false', () => {
      renderModal({ opened: false });
      expect(screen.queryByText('Change Asset Location')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should disable Update button when no location is selected', () => {
      renderModal();
      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      expect(updateButton).toBeDisabled();
    });

    it('should enable Update button when location is selected', async () => {
      renderModal();
      
      // Click the select to open it
      const select = screen.getByPlaceholderText('Select location');
      await userEvent.click(select);

      // Select "Warehouse B" option
      const option = await screen.findByRole('option', { name: 'Warehouse B' });
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

      // Select location
      const select = screen.getByPlaceholderText('Select location');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Warehouse B' });
      await userEvent.click(option);

      // Click update
      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });

      // Verify each asset was updated with the new location
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: '1', data: { location: 'Warehouse B' } });
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: '2', data: { location: 'Warehouse B' } });
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: '3', data: { location: 'Warehouse B' } });
    });

    it('should call onSuccess and onClose after successful update', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      renderModal({ onSuccess, onClose });

      // Select location and update
      const select = screen.getByPlaceholderText('Select location');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Warehouse B' });
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

      const onClose = vi.fn();
      renderModal({ onClose });

      // Select location and update
      const select = screen.getByPlaceholderText('Select location');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Office' });
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
    it('should register bulk action for undo after successful location change', async () => {
      renderModal();

      // Select location
      const select = screen.getByPlaceholderText('Select location');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Warehouse B' });
      await userEvent.click(option);

      // Click update
      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockRegisterBulkAction).toHaveBeenCalledTimes(1);
      });

      // Verify registerBulkAction was called with correct type
      expect(mockRegisterBulkAction).toHaveBeenCalledWith(
        'location',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            assetId: '1',
            previousValue: expect.objectContaining({ location: 'Warehouse A' }),
          }),
          expect.objectContaining({
            assetId: '2',
            previousValue: expect.objectContaining({ location: 'Warehouse A' }),
          }),
          expect.objectContaining({
            assetId: '3',
            previousValue: expect.objectContaining({ location: 'Office' }),
          }),
        ])
      );
    });

    it('should include previous location values for each asset', async () => {
      renderModal();

      // Select location and update
      const select = screen.getByPlaceholderText('Select location');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Office' });
      await userEvent.click(option);

      const updateButton = screen.getByRole('button', { name: /Update 3 Assets/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockRegisterBulkAction).toHaveBeenCalled();
      });

      const [, , affectedAssets] = mockRegisterBulkAction.mock.calls[0];
      
      // Asset 1 and 2 had 'Warehouse A', Asset 3 had 'Office'
      expect(affectedAssets).toHaveLength(3);
      expect(affectedAssets.find((a: { assetId: string }) => a.assetId === '1')?.previousValue.location).toBe('Warehouse A');
      expect(affectedAssets.find((a: { assetId: string }) => a.assetId === '3')?.previousValue.location).toBe('Office');
    });

    it('should not register undo action when all updates fail', async () => {
      mockMutateAsync.mockRejectedValue(new Error('All failed'));

      renderModal();

      // Select location and update
      const select = screen.getByPlaceholderText('Select location');
      await userEvent.click(select);
      const option = await screen.findByRole('option', { name: 'Warehouse B' });
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
