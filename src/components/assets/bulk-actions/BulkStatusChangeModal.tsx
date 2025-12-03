/**
 * T8.2.3 - Bulk Status Change Modal
 * Allows updating status of multiple selected assets
 */
import { useState } from 'react';
import { Button, Group, Modal, Select, Stack, Text, Progress } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { ASSET_STATUS_OPTIONS } from '../../../constants/assetStatuses';
import { useUpdateAsset } from '../../../hooks/useAssets';
import { useBulkUndo } from '../../../hooks/useBulkUndo';
import { executeBulkOperation, type BulkOperationProgress } from '../../../services/BulkOperationService';
import type { Asset, AssetStatus } from '../../../types/entities';
import type { AffectedAsset } from '../../../services/BulkUndoService';

interface BulkStatusChangeModalProps {
  opened: boolean;
  onClose: () => void;
  selectedAssets: Asset[];
  onSuccess?: () => void;
}

/**
 * Modal for bulk status change operations on selected assets.
 * Provides a dropdown to select new status and shows progress during update.
 */
export function BulkStatusChangeModal({
  opened,
  onClose,
  selectedAssets,
  onSuccess,
}: BulkStatusChangeModalProps) {
  const { t } = useTranslation('assets');
  const [newStatus, setNewStatus] = useState<AssetStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const updateAsset = useUpdateAsset();
  const { registerBulkAction } = useBulkUndo();

  const handleStatusChange = async () => {
    if (!newStatus) return;

    setIsUpdating(true);
    setProgress({ total: selectedAssets.length, completed: 0, failed: 0, percentage: 0 });

    // Capture previous values for undo before making changes
    const affectedAssets: AffectedAsset[] = selectedAssets.map((asset) => ({
      assetId: asset.id,
      previousValue: { status: asset.status },
    }));

    const result = await executeBulkOperation(
      selectedAssets,
      async (asset) => {
        await updateAsset.mutateAsync({
          id: asset.id,
          data: { status: newStatus },
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
      // successfulItems contains the asset IDs that were successfully updated
      const successfulAssetIds = new Set(result.successfulItems);
      const successfulAssets = affectedAssets.filter((a) => successfulAssetIds.has(a.assetId));
      
      if (successfulAssets.length > 0) {
        registerBulkAction(
          'status',
          t('bulkActions.statusChangeSuccessMessage', {
            count: successfulAssets.length,
            status: newStatus,
          }),
          successfulAssets
        );
      }

      notifications.show({
        title: t('bulkActions.statusChangeSuccess'),
        message: t('bulkActions.statusChangeSuccessMessage', {
          count: result.successCount,
          status: newStatus,
        }),
        color: 'green',
      });
    }

    if (result.failureCount > 0) {
      notifications.show({
        title: t('bulkActions.statusChangePartialFailure'),
        message: t('bulkActions.statusChangeFailureMessage', {
          count: result.failureCount,
        }),
        color: 'yellow',
      });
    }

    setNewStatus(null);
    onClose();
    onSuccess?.();
  };

  const handleClose = () => {
    if (!isUpdating) {
      setNewStatus(null);
      setProgress(null);
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('bulkActions.changeStatusTitle')}
      size="md"
      closeOnClickOutside={!isUpdating}
      closeOnEscape={!isUpdating}
    >
      <Stack gap="md">
        <Text size="sm">
          {t('bulkActions.changeStatusDescription', { count: selectedAssets.length })}
        </Text>

        <Select
          label={t('bulkActions.newStatus')}
          placeholder={t('bulkActions.selectStatus')}
          value={newStatus}
          onChange={(val) => setNewStatus(val as AssetStatus)}
          data={ASSET_STATUS_OPTIONS}
          disabled={isUpdating}
          required
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
            onClick={handleStatusChange}
            disabled={!newStatus || isUpdating}
            loading={isUpdating}
          >
            {t('bulkActions.updateAssets', { count: selectedAssets.length })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
