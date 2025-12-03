/**
 * T8.2.5 - Bulk Tag Change Modal
 * Allows adding or removing tags from multiple selected assets
 */
import { useState } from 'react';
import { Button, Group, Modal, Stack, Text, Progress, SegmentedControl } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { TagInput } from '../../tags/TagInput';
import { useUpdateAsset } from '../../../hooks/useAssets';
import { useBulkUndo } from '../../../hooks/useBulkUndo';
import { useTags } from '../../../hooks/useTags';
import { executeBulkOperation, type BulkOperationProgress } from '../../../services/BulkOperationService';
import type { Asset, UUID } from '../../../types/entities';
import type { AffectedAsset } from '../../../services/BulkUndoService';

type TagOperation = 'add' | 'remove';

interface BulkTagChangeModalProps {
  opened: boolean;
  onClose: () => void;
  selectedAssets: Asset[];
  onSuccess?: () => void;
}

/**
 * Modal for bulk tag operations (add/remove) on selected assets.
 * Provides a tag selector and shows progress during update.
 */
export function BulkTagChangeModal({
  opened,
  onClose,
  selectedAssets,
  onSuccess,
}: BulkTagChangeModalProps) {
  const { t } = useTranslation('assets');
  const [operation, setOperation] = useState<TagOperation>('add');
  const [selectedTagIds, setSelectedTagIds] = useState<UUID[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const updateAsset = useUpdateAsset();
  const { registerBulkAction } = useBulkUndo();
  const { tags, isLoading: isLoadingTags } = useTags();

  const handleTagChange = async () => {
    if (selectedTagIds.length === 0) return;

    setIsUpdating(true);
    setProgress({ total: selectedAssets.length, completed: 0, failed: 0, percentage: 0 });

    // Capture previous values for undo before making changes
    const affectedAssets: AffectedAsset[] = selectedAssets.map((asset) => ({
      assetId: asset.id,
      previousValue: { tagIds: asset.tagIds ?? [] },
    }));

    const result = await executeBulkOperation(
      selectedAssets,
      async (asset) => {
        const currentTagIds = asset.tagIds ?? [];
        let newTagIds: UUID[];

        if (operation === 'add') {
          // Add tags, avoiding duplicates
          newTagIds = [...new Set([...currentTagIds, ...selectedTagIds])];
        } else {
          // Remove tags
          newTagIds = currentTagIds.filter((id) => !selectedTagIds.includes(id));
        }

        await updateAsset.mutateAsync({
          id: asset.id,
          data: { tagIds: newTagIds },
        });
        return asset.id;
      },
      {
        onProgress: setProgress,
      }
    );

    setIsUpdating(false);
    setProgress(null);

    if (result.successCount > 0) {
      // Register for undo only if some updates succeeded (T8.3.2)
      const successfulAssetIds = new Set(result.successfulItems);
      const successfulAssets = affectedAssets.filter((a) => successfulAssetIds.has(a.assetId));
      
      if (successfulAssets.length > 0) {
        registerBulkAction(
          'tags',
          t('bulkActions.tagChangeSuccessMessage', {
            count: successfulAssets.length,
          }),
          successfulAssets
        );
      }

      notifications.show({
        title: t('bulkActions.tagChangeSuccess'),
        message: t('bulkActions.tagChangeSuccessMessage', {
          count: result.successCount,
        }),
        color: 'green',
      });
    }

    if (result.failureCount > 0) {
      notifications.show({
        title: t('bulkActions.tagChangePartialFailure'),
        message: t('bulkActions.tagChangeFailureMessage', {
          count: result.failureCount,
        }),
        color: 'yellow',
      });
    }

    setSelectedTagIds([]);
    setOperation('add');
    onClose();
    onSuccess?.();
  };

  const handleClose = () => {
    if (!isUpdating) {
      setSelectedTagIds([]);
      setOperation('add');
      setProgress(null);
      onClose();
    }
  };

  const operationDescription =
    operation === 'add'
      ? t('bulkActions.addTagsDescription')
      : t('bulkActions.removeTagsDescription');

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('bulkActions.manageTagsTitle')}
      size="md"
      closeOnClickOutside={!isUpdating}
      closeOnEscape={!isUpdating}
    >
      <Stack gap="md">
        <Text size="sm">
          {t('bulkActions.manageTagsDescription', { count: selectedAssets.length })}
        </Text>

        <SegmentedControl
          value={operation}
          onChange={(value) => {
            setOperation(value as TagOperation);
            setSelectedTagIds([]);
          }}
          disabled={isUpdating}
          data={[
            { label: t('bulkActions.addTags'), value: 'add' },
            { label: t('bulkActions.removeTags'), value: 'remove' },
          ]}
          fullWidth
        />

        <Text size="xs" c="dimmed">
          {operationDescription}
        </Text>

        <TagInput
          tags={tags}
          selectedTagIds={selectedTagIds}
          onChange={setSelectedTagIds}
          disabled={isUpdating}
          isLoading={isLoadingTags}
          label={operation === 'add' ? t('bulkActions.tagsToAdd') : t('bulkActions.tagsToRemove')}
          placeholder={t('bulkActions.selectTags')}
        />

        {progress && (
          <Stack gap="xs">
            <Text size="xs" c="dimmed">
              {t('bulkActions.progress', {
                completed: progress.completed,
                total: progress.total,
              })}
            </Text>
            <Progress value={progress.percentage} animated />
          </Stack>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose} disabled={isUpdating}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            onClick={handleTagChange}
            disabled={selectedTagIds.length === 0 || isUpdating}
            loading={isUpdating}
          >
            {t('bulkActions.applyTagChanges')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
