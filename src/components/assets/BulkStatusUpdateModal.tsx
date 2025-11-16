/**
 * T100 - US4: Bulk Status Update Modal
 * Allows updating status of all child assets simultaneously
 */
import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useUpdateAsset } from '../../hooks/useAssets';
import type { Asset, AssetStatus } from '../../types/entities';

interface BulkStatusUpdateModalProps {
  opened: boolean;
  onClose: () => void;
  parentAsset: Asset;
  childAssets: Asset[];
}

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'in-use', label: 'In Use' },
  { value: 'broken', label: 'Broken' },
  { value: 'in-repair', label: 'In Repair' },
  { value: 'installed', label: 'Installed' },
  { value: 'sold', label: 'Sold' },
  { value: 'destroyed', label: 'Destroyed' },
];

async function updateChildrenStatus(
  childAssets: Asset[],
  newStatus: AssetStatus,
  updateAsset: ReturnType<typeof useUpdateAsset>
): Promise<{ successCount: number; errorCount: number }> {
  let successCount = 0;
  let errorCount = 0;

  for (const child of childAssets) {
    try {
      await updateAsset.mutateAsync({
        id: child.id,
        data: { status: newStatus },
      });
      successCount++;
    } catch (err) {
      errorCount++;
      console.error(`Failed to update ${child.assetNumber}:`, err);
    }
  }

  return { successCount, errorCount };
}

function showStatusNotification(successCount: number, errorCount: number, status: AssetStatus) {
  if (errorCount === 0) {
    notifications.show({
      title: 'Success',
      message: `Updated status of ${successCount} child assets to ${status}`,
      color: 'green',
    });
  } else {
    notifications.show({
      title: 'Partial Success',
      message: `Updated ${successCount} assets. ${errorCount} failed.`,
      color: 'yellow',
    });
  }
}

export function BulkStatusUpdateModal({
  opened,
  onClose,
  parentAsset,
  childAssets,
}: BulkStatusUpdateModalProps) {
  const [newStatus, setNewStatus] = useState<AssetStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateAsset = useUpdateAsset();

  const handleBulkUpdate = async () => {
    if (!newStatus) return;

    setIsUpdating(true);
    const { successCount, errorCount } = await updateChildrenStatus(
      childAssets,
      newStatus,
      updateAsset
    );
    showStatusNotification(successCount, errorCount, newStatus);
    setIsUpdating(false);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Update All Child Assets" size="md">
      <Stack gap="md">
        <Text size="sm">
          This will update the status of all {childAssets.length} child assets of{' '}
          <strong>{parentAsset.name}</strong>.
        </Text>
        <Select
          label="New Status"
          placeholder="Select status"
          value={newStatus}
          onChange={(val) => setNewStatus(val as AssetStatus)}
          data={STATUS_OPTIONS}
          required
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleBulkUpdate} disabled={!newStatus || isUpdating} loading={isUpdating}>
            Update {childAssets.length} Assets
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
