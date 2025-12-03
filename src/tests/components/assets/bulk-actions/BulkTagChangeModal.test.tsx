/**
 * Tests for BulkTagChangeModal
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import '@testing-library/jest-dom/vitest';
import { BulkTagChangeModal } from '../../../../components/assets/bulk-actions/BulkTagChangeModal';
import type { Asset, AssetStatus, UUID } from '../../../../types/entities';
import type { Tag } from '../../../../types/tag';

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
        'bulkActions.manageTagsTitle': 'Manage Tags',
        'bulkActions.manageTagsDescription': `Add or remove tags from ${params?.count || 0} selected assets.`,
        'bulkActions.addTags': 'Add Tags',
        'bulkActions.removeTags': 'Remove Tags',
        'bulkActions.addTagsDescription': 'Select tags to add to all selected assets.',
        'bulkActions.removeTagsDescription': 'Select tags to remove from all selected assets.',
        'bulkActions.tagsToAdd': 'Tags to Add',
        'bulkActions.tagsToRemove': 'Tags to Remove',
        'bulkActions.selectTags': 'Select tags',
        'bulkActions.applyTagChanges': 'Apply Changes',
        'bulkActions.progress': `${params?.completed || 0} of ${params?.total || 0} completed`,
        'bulkActions.tagChangeSuccess': 'Tags Updated',
        'bulkActions.tagChangeSuccessMessage': `Successfully updated tags for ${params?.count || 0} assets.`,
        'bulkActions.tagChangePartialFailure': 'Partial Update',
        'bulkActions.tagChangeFailureMessage': `Failed to update tags for ${params?.count || 0} assets.`,
        'common:actions.cancel': 'Cancel',
        'tags:selectTags': 'Select Tags',
        'tags:searchOrCreateTag': 'Search or create tag',
        'tags:noTagsFound': 'No tags found',
        'tags:createTag': 'Create tag',
        'tags:notifications.created': 'Tag created',
        'tags:notifications.createError': 'Failed to create tag',
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

const mockTags: Tag[] = [
  { id: 'tag-1' as UUID, name: 'Equipment', color: '#228BE6', createdBy: 'user-1', createdByName: 'User', createdAt: new Date().toISOString() },
  { id: 'tag-2' as UUID, name: 'Fragile', color: '#FA5252', createdBy: 'user-1', createdByName: 'User', createdAt: new Date().toISOString() },
  { id: 'tag-3' as UUID, name: 'Priority', color: '#40C057', createdBy: 'user-1', createdByName: 'User', createdAt: new Date().toISOString() },
];

vi.mock('../../../../hooks/useTags', () => ({
  useTags: () => ({
    tags: mockTags,
    isLoading: false,
    createTag: vi.fn(),
  }),
}));

vi.mock('../../../../hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'user-1', name: 'Test User' },
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

const createMockAsset = (id: string, name: string, tagIds: UUID[] = []): Asset => ({
  id,
  assetNumber: `A${id}`,
  name,
  status: 'available' as AssetStatus,
  tagIds,
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
  createMockAsset('1', 'Camera 1', ['tag-1' as UUID]),
  createMockAsset('2', 'Camera 2', ['tag-1' as UUID, 'tag-2' as UUID]),
  createMockAsset('3', 'Laptop 1', []),
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
      <BulkTagChangeModal {...defaultProps} {...props} />
    </MantineProvider>
  );
};

describe('BulkTagChangeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
    mockRegisterBulkAction.mockReturnValue('mock-action-id');
  });

  describe('Rendering', () => {
    it('should render the modal when opened', () => {
      renderModal();
      expect(screen.getByText('Manage Tags')).toBeInTheDocument();
    });

    it('should display the count of selected assets', () => {
      renderModal();
      expect(screen.getByText(/3 selected assets/i)).toBeInTheDocument();
    });

    it('should render Add Tags and Remove Tags toggle', () => {
      renderModal();
      expect(screen.getByText('Add Tags')).toBeInTheDocument();
      expect(screen.getByText('Remove Tags')).toBeInTheDocument();
    });

    it('should render Cancel and Apply Changes buttons', () => {
      renderModal();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply Changes' })).toBeInTheDocument();
    });

    it('should not render when opened is false', () => {
      renderModal({ opened: false });
      expect(screen.queryByText('Manage Tags')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should disable Apply Changes button when no tags are selected', () => {
      renderModal();
      const applyButton = screen.getByRole('button', { name: 'Apply Changes' });
      expect(applyButton).toBeDisabled();
    });

    it('should switch between Add and Remove operations', async () => {
      renderModal();
      
      // Initially in "Add Tags" mode
      expect(screen.getByText('Select tags to add to all selected assets.')).toBeInTheDocument();

      // Switch to Remove Tags
      await userEvent.click(screen.getByText('Remove Tags'));
      expect(screen.getByText('Select tags to remove from all selected assets.')).toBeInTheDocument();
    });
  });

  describe('Bulk Add Tags', () => {
    it('should add tags to all selected assets', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      renderModal({ onSuccess, onClose });

      // Open the tag dropdown and select a tag
      const tagInput = screen.getByPlaceholderText('Select tags');
      await userEvent.click(tagInput);

      // Select "Priority" tag
      const priorityOption = await screen.findByText('Priority');
      await userEvent.click(priorityOption);

      // Click apply
      const applyButton = screen.getByRole('button', { name: 'Apply Changes' });
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });

      // Asset 1: tag-1 + tag-3 (Priority)
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: '1',
        data: { tagIds: ['tag-1', 'tag-3'] },
      });
      // Asset 2: tag-1, tag-2 + tag-3 (Priority)
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: '2',
        data: { tagIds: ['tag-1', 'tag-2', 'tag-3'] },
      });
      // Asset 3: [] + tag-3 (Priority)
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: '3',
        data: { tagIds: ['tag-3'] },
      });
    });
  });

  describe('Bulk Remove Tags', () => {
    it('should remove tags from all selected assets', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      renderModal({ onSuccess, onClose });

      // Switch to Remove Tags mode
      await userEvent.click(screen.getByText('Remove Tags'));

      // Open the tag dropdown and select a tag
      const tagInput = screen.getByPlaceholderText('Select tags');
      await userEvent.click(tagInput);

      // Select "Equipment" tag (tag-1)
      const equipmentOption = await screen.findByText('Equipment');
      await userEvent.click(equipmentOption);

      // Click apply
      const applyButton = screen.getByRole('button', { name: 'Apply Changes' });
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });

      // Asset 1: was [tag-1], now []
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: '1',
        data: { tagIds: [] },
      });
      // Asset 2: was [tag-1, tag-2], now [tag-2]
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: '2',
        data: { tagIds: ['tag-2'] },
      });
      // Asset 3: was [], still []
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: '3',
        data: { tagIds: [] },
      });
    });
  });

  describe('Error handling', () => {
    it('should handle partial failures gracefully', async () => {
      mockMutateAsync
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Update failed'));

      const onClose = vi.fn();
      renderModal({ onClose });

      // Select a tag
      const tagInput = screen.getByPlaceholderText('Select tags');
      await userEvent.click(tagInput);
      const priorityOption = await screen.findByText('Priority');
      await userEvent.click(priorityOption);

      // Click apply
      const applyButton = screen.getByRole('button', { name: 'Apply Changes' });
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Undo Integration (T8.3.2)', () => {
    it('should register bulk action for undo after successful tag add', async () => {
      renderModal();

      // Select a tag to add
      const tagInput = screen.getByPlaceholderText('Select tags');
      await userEvent.click(tagInput);
      const priorityOption = await screen.findByText('Priority');
      await userEvent.click(priorityOption);

      // Click apply
      const applyButton = screen.getByRole('button', { name: 'Apply Changes' });
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(mockRegisterBulkAction).toHaveBeenCalledTimes(1);
      });

      // Verify registerBulkAction was called with correct type
      expect(mockRegisterBulkAction).toHaveBeenCalledWith(
        'tags',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            assetId: '1',
            previousValue: expect.objectContaining({ tagIds: ['tag-1'] }),
          }),
          expect.objectContaining({
            assetId: '2',
            previousValue: expect.objectContaining({ tagIds: ['tag-1', 'tag-2'] }),
          }),
          expect.objectContaining({
            assetId: '3',
            previousValue: expect.objectContaining({ tagIds: [] }),
          }),
        ])
      );
    });

    it('should include previous tagIds values for each asset', async () => {
      renderModal();

      // Switch to Remove Tags mode
      await userEvent.click(screen.getByText('Remove Tags'));

      // Select a tag to remove
      const tagInput = screen.getByPlaceholderText('Select tags');
      await userEvent.click(tagInput);
      const equipmentOption = await screen.findByText('Equipment');
      await userEvent.click(equipmentOption);

      // Click apply
      const applyButton = screen.getByRole('button', { name: 'Apply Changes' });
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(mockRegisterBulkAction).toHaveBeenCalled();
      });

      const [, , affectedAssets] = mockRegisterBulkAction.mock.calls[0];
      
      expect(affectedAssets).toHaveLength(3);
      // Asset 1 had ['tag-1'], Asset 2 had ['tag-1', 'tag-2'], Asset 3 had []
      expect(affectedAssets.find((a: { assetId: string }) => a.assetId === '1')?.previousValue.tagIds).toEqual(['tag-1']);
      expect(affectedAssets.find((a: { assetId: string }) => a.assetId === '2')?.previousValue.tagIds).toEqual(['tag-1', 'tag-2']);
      expect(affectedAssets.find((a: { assetId: string }) => a.assetId === '3')?.previousValue.tagIds).toEqual([]);
    });

    it('should not register undo action when all updates fail', async () => {
      mockMutateAsync.mockRejectedValue(new Error('All failed'));

      renderModal();

      // Select a tag
      const tagInput = screen.getByPlaceholderText('Select tags');
      await userEvent.click(tagInput);
      const priorityOption = await screen.findByText('Priority');
      await userEvent.click(priorityOption);

      // Click apply
      const applyButton = screen.getByRole('button', { name: 'Apply Changes' });
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });

      // Should not register undo when no updates succeeded
      expect(mockRegisterBulkAction).not.toHaveBeenCalled();
    });
  });
});
