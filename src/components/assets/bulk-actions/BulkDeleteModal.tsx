/**
 * T8.2.7 - Bulk Delete Modal
 * Allows soft-deleting multiple selected assets
 */
import { useState } from 'react';
import { Button, Group, Modal, Stack, Text, Progress, Alert } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useUpdateAsset } from '../../../hooks/useAssets';
import { useBulkUndo } from '../../../hooks/useBulkUndo';
import { executeBulkOperation, type BulkOperationProgress } from '../../../services/BulkOperationService';
import type { Asset } from '../../../types/entities';
import type { AffectedAsset } from '../../../services/BulkUndoService';

interface BulkDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  selectedAssets: Asset[];
  onSuccess?: () => void;
}

/**
 * Modal for bulk soft-delete operations on selected assets.
 * Sets the status to 'deleted' for all selected assets.
 */
export function BulkDeleteModal({
  opened,
  onClose,
  selectedAssets,
  onSuccess,
}: BulkDeleteModalProps) {
  const { t } = useTranslation('assets');
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const updateAsset = useUpdateAsset();
  const { registerBulkAction } = useBulkUndo();

  const handleDelete = async () => {
    setIsDeleting(true);
    setProgress({ total: selectedAssets.length, completed: 0, failed: 0, percentage: 0 });

    // Capture previous values for undo before making changes (store original status)
    const affectedAssets: AffectedAsset[] = selectedAssets.map((asset) => ({
      assetId: asset.id,
      previousValue: { status: asset.status },
    }));

    const result = await executeBulkOperation(
      selectedAssets,
      async (asset) => {
        await updateAsset.mutateAsync({
          id: asset.id,
          data: { status: 'deleted' },
        });
        return asset.id;
      },
      {
        onProgress: setProgress,
      }
    );

    setIsDeleting(false);
    setProgress(null);

    if (result.successCount > 0) {
      // Register for undo only if some deletes succeeded (T8.3.2)
      const successfulAssetIds = new Set(result.successfulItems);
      const successfulAssets = affectedAssets.filter((a) => successfulAssetIds.has(a.assetId));
      
      if (successfulAssets.length > 0) {
        registerBulkAction(
          'delete',
          t('bulkActions.deleteSuccessMessage', {
            count: successfulAssets.length,
          }),
          successfulAssets
        );
      }

      notifications.show({
        title: t('bulkActions.deleteSuccess'),
        message: t('bulkActions.deleteSuccessMessage', {
          count: result.successCount,
        }),
        color: 'green',
      });
    }

    if (result.failureCount > 0) {
      notifications.show({
        title: t('bulkActions.deletePartialFailure'),
        message: t('bulkActions.deleteFailureMessage', {
          count: result.failureCount,
        }),
        color: 'yellow',
      });
    }

    onClose();
    onSuccess?.();
  };

  const handleClose = () => {
    if (!isDeleting) {
      setProgress(null);
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('bulkActions.deleteTitle')}
      size="md"
      closeOnClickOutside={!isDeleting}
      closeOnEscape={!isDeleting}
    >
      <Stack gap="md">
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title={t('bulkActions.deleteTitle')}
          color="red"
          variant="light"
        >
          {t('bulkActions.deleteDescription', { count: selectedAssets.length })}
        </Alert>

        <Text size="sm" c="dimmed">
          {t('bulkActions.deleteWarning')}
        </Text>

        {progress && (
          <Stack gap="xs">
            <Text size="xs" c="dimmed">
              {t('bulkActions.progress', {
                completed: progress.completed,
                total: progress.total,
              })}
            </Text>
            <Progress value={progress.percentage} animated color="red" />
          </Stack>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose} disabled={isDeleting}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            disabled={isDeleting}
            loading={isDeleting}
          >
            {t('bulkActions.deleteConfirm', { count: selectedAssets.length })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
