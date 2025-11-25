/**
 * Manage Child Assets Modal
 * Add or remove child assets from a parent
 */
import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useAssets, useUpdateAsset } from '../../hooks/useAssets';
import type { Asset } from '../../types/entities';

interface ManageChildAssetsModalProps {
  opened: boolean;
  onClose: () => void;
  parentAsset: Asset;
  currentChildren: Asset[];
}

async function addChildToParent(
  childId: string,
  parentId: string,
  parentChildIds: string[],
  childName: string,
  updateAsset: ReturnType<typeof useUpdateAsset>
) {
  await updateAsset.mutateAsync({ id: childId, data: { parentAssetId: parentId } });
  await updateAsset.mutateAsync({ 
    id: parentId, 
    data: { childAssetIds: [...parentChildIds, childId] } 
  });
  notifications.show({
    title: 'Success',
    message: `Added "${childName}" as child asset`,
    color: 'green',
  });
}

async function removeChildFromParent(
  childId: string,
  parentId: string,
  parentChildIds: string[],
  childName: string,
  updateAsset: ReturnType<typeof useUpdateAsset>
) {
  await updateAsset.mutateAsync({ id: childId, data: { parentAssetId: undefined } });
  await updateAsset.mutateAsync({
    id: parentId,
    data: { childAssetIds: parentChildIds.filter((id) => id !== childId) },
  });
  notifications.show({
    title: 'Success',
    message: `Removed "${childName}" from parent`,
    color: 'green',
  });
}

function useAddChildHandler(
  allAssets: Asset[],
  parentAsset: Asset,
  updateAsset: ReturnType<typeof useUpdateAsset>
) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!selectedAssetId) return;
    setIsAdding(true);
    try {
      const childAsset = allAssets.find((a) => a.id === selectedAssetId);
      if (!childAsset) throw new Error('Asset not found');
      await addChildToParent(selectedAssetId, parentAsset.id, parentAsset.childAssetIds || [], childAsset.name, updateAsset);
      setSelectedAssetId(null);
    } catch (err) {
      notifications.show({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to add', color: 'red' });
    } finally {
      setIsAdding(false);
    }
  };

  return { selectedAssetId, setSelectedAssetId, isAdding, handleAdd };
}

export function ManageChildAssetsModal({ opened, onClose, parentAsset, currentChildren }: ManageChildAssetsModalProps) {
  const { data: allAssets = [] } = useAssets();
  const updateAsset = useUpdateAsset();
  const { selectedAssetId, setSelectedAssetId, isAdding, handleAdd } = useAddChildHandler(allAssets, parentAsset, updateAsset);

  const availableAssets = allAssets.filter(
    (a) =>
      !a.isParent &&
      !a.parentAssetId &&
      a.id !== parentAsset.id &&
      a.assetType.id === parentAsset.assetType.id
  );

  const handleRemove = async (childId: string) => {
    if (!window.confirm('Remove this asset from parent? It will become a standalone asset.')) return;
    try {
      const childAsset = currentChildren.find((c) => c.id === childId);
      await removeChildFromParent(childId, parentAsset.id, parentAsset.childAssetIds || [], childAsset?.name || 'Asset', updateAsset);
    } catch (err) {
      notifications.show({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to remove', color: 'red' });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Manage Child Assets" size="md">
      <Stack gap="md">
        <AddChildSection
          availableAssets={availableAssets}
          selectedAssetId={selectedAssetId}
          setSelectedAssetId={setSelectedAssetId}
          onAdd={handleAdd}
          isAdding={isAdding}
        />
        <CurrentChildrenSection currentChildren={currentChildren} onRemove={handleRemove} />
      </Stack>
    </Modal>
  );
}

interface AddChildSectionProps {
  availableAssets: Asset[];
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  onAdd: () => void;
  isAdding: boolean;
}

function AddChildSection({ availableAssets, selectedAssetId, setSelectedAssetId, onAdd, isAdding }: AddChildSectionProps) {
  return (
    <div>
      <Text size="sm" fw={500} mb="xs">Add Child Asset</Text>
      <Group>
        <Select
          placeholder="Select asset to add"
          value={selectedAssetId}
          onChange={setSelectedAssetId}
          data={availableAssets.map((a) => ({ value: a.id, label: `${a.assetNumber} - ${a.name}` }))}
          searchable
          style={{ flex: 1 }}
        />
        <Button onClick={onAdd} disabled={!selectedAssetId || isAdding} loading={isAdding}>Add</Button>
      </Group>
      {availableAssets.length === 0 && (
        <Text size="xs" c="dimmed" mt="xs">
          No compatible standalone assets available for this asset type
        </Text>
      )}
    </div>
  );
}

function CurrentChildrenSection({ currentChildren, onRemove }: { currentChildren: Asset[]; onRemove: (id: string) => void }) {
  return (
    <div>
      <Text size="sm" fw={500} mb="xs">Current Children ({currentChildren.length})</Text>
      <Stack gap="xs">
        {currentChildren.map((child) => (
          <Group key={child.id} justify="space-between" p="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '4px' }}>
            <div>
              <Text size="sm">{child.name}</Text>
              <Text size="xs" c="dimmed">{child.assetNumber}</Text>
            </div>
            <Button size="xs" variant="subtle" color="red" onClick={() => onRemove(child.id)}>Remove</Button>
          </Group>
        ))}
      </Stack>
    </div>
  );
}
