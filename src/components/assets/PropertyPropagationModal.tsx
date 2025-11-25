/**
 * T101 - US4: Property Propagation Modal
 * Allows propagating selected properties from parent to all children
 */
import { Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useUpdateAsset } from '../../hooks/useAssets';
import type { Asset } from '../../types/entities';

interface PropertyPropagationModalProps {
  opened: boolean;
  onClose: () => void;
  parentAsset: Asset;
  childAssets: Asset[];
}

const PROPAGATABLE_PROPERTIES = [
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'model', label: 'Model' },
  { key: 'description', label: 'Description' },
  { key: 'assetType', label: 'Asset Type' },
  { key: 'customFieldValues', label: 'Custom Fields' },
] as const;

async function propagateProperties(
  childAssets: Asset[],
  parentAsset: Asset,
  selectedProps: Set<string>,
  updateAsset: ReturnType<typeof useUpdateAsset>
): Promise<{ successCount: number; errorCount: number }> {
  let successCount = 0;
  let errorCount = 0;

  for (const child of childAssets) {
    try {
      const updates: Record<string, unknown> = {};
      
      if (selectedProps.has('manufacturer')) updates['manufacturer'] = parentAsset.manufacturer;
      if (selectedProps.has('model')) updates['model'] = parentAsset.model;
      if (selectedProps.has('description')) updates['description'] = parentAsset.description;
  if (selectedProps.has('assetType')) updates['assetType'] = parentAsset.assetType;
      if (selectedProps.has('customFieldValues')) {
        updates['customFieldValues'] = parentAsset.customFieldValues;
      }

      await updateAsset.mutateAsync({ id: child.id, data: updates });
      successCount++;
    } catch (err) {
      errorCount++;
      console.error(`Failed to update ${child.assetNumber}:`, err);
    }
  }

  return { successCount, errorCount };
}

function showPropagationNotification(successCount: number, errorCount: number, propCount: number) {
  if (errorCount === 0) {
    notifications.show({
      title: 'Success',
      message: `Updated ${propCount} properties on ${successCount} child assets`,
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

export function PropertyPropagationModal({
  opened,
  onClose,
  parentAsset,
  childAssets,
}: PropertyPropagationModalProps) {
  const [selectedProps, setSelectedProps] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const updateAsset = useUpdateAsset();

  const toggleProperty = (key: string) => {
    const newSet = new Set(selectedProps);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedProps(newSet);
  };

  const handlePropagate = async () => {
    if (selectedProps.size === 0) return;

    setIsUpdating(true);
    const { successCount, errorCount } = await propagateProperties(
      childAssets,
      parentAsset,
      selectedProps,
      updateAsset
    );
    showPropagationNotification(successCount, errorCount, selectedProps.size);
    setIsUpdating(false);
    setSelectedProps(new Set());
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Propagate Properties to Children" size="md">
      <Stack gap="md">
        <Text size="sm">
          Select properties to copy from <strong>{parentAsset.name}</strong> to all {childAssets.length} children.
        </Text>
        <Stack gap="xs">
          {PROPAGATABLE_PROPERTIES.map(({ key, label }) => (
            <Checkbox key={key} label={label} checked={selectedProps.has(key)} onChange={() => toggleProperty(key)} />
          ))}
        </Stack>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={isUpdating}>Cancel</Button>
          <Button onClick={handlePropagate} disabled={selectedProps.size === 0 || isUpdating} loading={isUpdating}>
            Update {childAssets.length} Assets
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
