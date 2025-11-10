import { useEffect, useMemo, useState } from 'react';
import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { Asset } from '../../types/entities';
import { useAddAssetToGroup, useAssetGroups } from '../../hooks/useAssetGroups';

interface JoinAssetGroupModalProps {
  asset: Asset;
  opened: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

export function JoinAssetGroupModal({ asset, opened, onClose, onJoined }: JoinAssetGroupModalProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const addAssetToGroup = useAddAssetToGroup();
  const { data: groups = [], isLoading } = useAssetGroups({ search });

  useEffect(() => {
    if (!opened) {
      setSelectedGroup(null);
      setSearch('');
    }
  }, [opened]);

  const assetTypeId = asset.assetType?.id ?? null;
  const assetTypeName = asset.assetType?.name ?? 'Unknown type';

  const eligibleGroups = useMemo(() => {
    if (!assetTypeId) {
      return [];
    }
    return groups.filter((group) => group.assetType.id === assetTypeId);
  }, [groups, assetTypeId]);

  const options = useMemo(() => eligibleGroups.map(group => ({
    value: group.id,
    label: group.groupNumber ? `${group.groupNumber} • ${group.name}` : group.name,
  })), [eligibleGroups]);

  const handleJoin = async () => {
    if (!selectedGroup) {
      notifications.show({
        title: 'Select a model',
        message: 'Choose an asset model before continuing.',
        color: 'yellow',
      });
      return;
    }

    try {
      await addAssetToGroup.mutateAsync({ assetId: asset.id, groupId: selectedGroup });
      notifications.show({
        title: 'Asset added to model',
        message: `${asset.name} now belongs to the selected asset model.`,
        color: 'green',
      });
      onJoined?.();
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Unable to add asset',
        message: error instanceof Error ? error.message : 'Unexpected error occurred.',
        color: 'red',
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Join Asset Model" size="md">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Select an existing asset model with the same type ({assetTypeName}). This asset will inherit any fields shared by the model.
        </Text>

        <Select
          label="Asset model"
          placeholder={isLoading ? 'Loading models...' : 'Search by name or number'}
          data={options}
          searchable
          nothingFoundMessage={search ? 'No matching models' : 'No models available'}
          value={selectedGroup}
          onChange={setSelectedGroup}
          searchValue={search}
          onSearchChange={setSearch}
        />

        {eligibleGroups.length === 0 && !isLoading && (
          <Text size="sm" c="dimmed">
            No asset models match the type "{assetTypeName}" yet. Create one from the asset detail view.
          </Text>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={addAssetToGroup.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handleJoin();
            }}
            loading={addAssetToGroup.isPending}
            disabled={eligibleGroups.length === 0}
          >
            Join Model
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
