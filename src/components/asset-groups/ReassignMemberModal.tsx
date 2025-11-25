import { useEffect, useMemo, useState } from 'react';
import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { Asset, AssetGroup } from '../../types/entities';
import { useAssetGroups, useReassignAssetToGroup } from '../../hooks/useAssetGroups';

interface ReassignMemberModalProps {
  asset: Asset | null;
  currentGroup: AssetGroup;
  opened: boolean;
  onClose: () => void;
  onReassigned?: () => void;
}

export function ReassignMemberModal({ asset, currentGroup, opened, onClose, onReassigned }: ReassignMemberModalProps) {
  const [search, setSearch] = useState('');
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const { data: groups = [], isLoading } = useAssetGroups({ search });
  const mutation = useReassignAssetToGroup();

  useEffect(() => {
    if (!opened) {
      setSearch('');
      setTargetGroupId(null);
    }
  }, [opened]);

  const currentAssetTypeId = currentGroup.assetType.id;
  const currentAssetTypeName = currentGroup.assetType.name;

  const eligibleGroups = useMemo(() => {
    return groups.filter(
      (group) => group.id !== currentGroup.id && group.assetType.id === currentAssetTypeId,
    );
  }, [groups, currentGroup.id, currentAssetTypeId]);

  const options = useMemo(() => eligibleGroups.map((group) => ({
    value: group.id,
    label: group.groupNumber ? `${group.groupNumber} • ${group.name}` : group.name,
  })), [eligibleGroups]);

  const handleReassign = async () => {
    if (!asset || !targetGroupId) {
      notifications.show({
        title: 'Select a destination model',
        message: 'Choose an asset model with the same type.',
        color: 'yellow',
      });
      return;
    }

    try {
      await mutation.mutateAsync({ assetId: asset.id, targetGroupId, currentGroupId: currentGroup.id });
      notifications.show({
        title: 'Asset moved',
        message: `${asset.name} now belongs to the selected asset model.`,
        color: 'green',
      });
      onReassigned?.();
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Unable to move asset',
        message: error instanceof Error ? error.message : 'Unexpected error occurred.',
        color: 'red',
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Move to another model" size="md">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Only models with type "{currentAssetTypeName}" are available. The asset keeps its data unless the new model overrides it.
        </Text>

        <Select
          label="Destination model"
          placeholder={isLoading ? 'Loading models…' : 'Search by name or number'}
          data={options}
          searchable
          searchValue={search}
          onSearchChange={setSearch}
          value={targetGroupId}
          onChange={setTargetGroupId}
          nothingFoundMessage={eligibleGroups.length === 0 ? 'No compatible models' : 'No match'}
          disabled={eligibleGroups.length === 0}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => { void handleReassign(); }} loading={mutation.isPending} disabled={!asset}>
            Move Asset
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
