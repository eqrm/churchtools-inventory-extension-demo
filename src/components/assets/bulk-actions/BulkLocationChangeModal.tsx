/**
 * T8.2.4 - Bulk Location Change Modal
 * Allows updating location of multiple selected assets
 */
import { useState } from 'react';
import { Button, Group, Modal, Stack, Text, Progress } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { MasterDataSelectInput } from '../../common/MasterDataSelectInput';
import { useUpdateAsset } from '../../../hooks/useAssets';
import { useBulkUndo } from '../../../hooks/useBulkUndo';
import { useMasterData } from '../../../hooks/useMasterDataNames';
import { MASTER_DATA_DEFINITIONS } from '../../../utils/masterData';
import { executeBulkOperation, type BulkOperationProgress } from '../../../services/BulkOperationService';
import type { Asset } from '../../../types/entities';
import type { AffectedAsset } from '../../../services/BulkUndoService';

interface BulkLocationChangeModalProps {
  opened: boolean;
  onClose: () => void;
  selectedAssets: Asset[];
  onSuccess?: () => void;
}

/**
 * Modal for bulk location change operations on selected assets.
 * Provides a dropdown to select new location and shows progress during update.
 */
export function BulkLocationChangeModal({
  opened,
  onClose,
  selectedAssets,
  onSuccess,
}: BulkLocationChangeModalProps) {
  const { t } = useTranslation('assets');
  const [newLocation, setNewLocation] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const updateAsset = useUpdateAsset();
  const { registerBulkAction } = useBulkUndo();
  const { names: locationNames, addItem: addLocation } = useMasterData(MASTER_DATA_DEFINITIONS.locations);

  const handleLocationChange = async () => {
    if (!newLocation) return;

    setIsUpdating(true);
    setProgress({ total: selectedAssets.length, completed: 0, failed: 0, percentage: 0 });

    // Capture previous values for undo before making changes
    const affectedAssets: AffectedAsset[] = selectedAssets.map((asset) => ({
      assetId: asset.id,
      previousValue: { location: asset.location },
    }));

    const result = await executeBulkOperation(
      selectedAssets,
      async (asset) => {
        await updateAsset.mutateAsync({
          id: asset.id,
          data: { location: newLocation },
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
          'location',
          t('bulkActions.locationChangeSuccessMessage', {
            count: successfulAssets.length,
          }),
          successfulAssets
        );
      }

      notifications.show({
        title: t('bulkActions.locationChangeSuccess'),
        message: t('bulkActions.locationChangeSuccessMessage', {
          count: result.successCount,
        }),
        color: 'green',
      });
    }

    if (result.failureCount > 0) {
      notifications.show({
        title: t('bulkActions.locationChangePartialFailure'),
        message: t('bulkActions.locationChangeFailureMessage', {
          count: result.failureCount,
        }),
        color: 'yellow',
      });
    }

    setNewLocation('');
    onClose();
    onSuccess?.();
  };

  const handleClose = () => {
    if (!isUpdating) {
      setNewLocation('');
      setProgress(null);
      onClose();
    }
  };

  const handleCreateLocation = async (name: string): Promise<string> => {
    await addLocation(name);
    return name;
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('bulkActions.changeLocationTitle')}
      size="md"
      closeOnClickOutside={!isUpdating}
      closeOnEscape={!isUpdating}
    >
      <Stack gap="md">
        <Text size="sm">
          {t('bulkActions.changeLocationDescription', { count: selectedAssets.length })}
        </Text>

        <MasterDataSelectInput
          label={t('bulkActions.newLocation')}
          placeholder={t('bulkActions.selectLocation')}
          value={newLocation}
          onChange={setNewLocation}
          names={locationNames}
          disabled={isUpdating}
          required
          onCreateOption={handleCreateLocation}
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
            onClick={handleLocationChange}
            disabled={!newLocation || isUpdating}
            loading={isUpdating}
          >
            {t('bulkActions.updateAssets', { count: selectedAssets.length })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
