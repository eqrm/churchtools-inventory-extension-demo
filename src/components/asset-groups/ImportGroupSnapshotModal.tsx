import { useState } from 'react';
import {
  Button,
  FileInput,
  Group,
  List,
  Modal,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import type { AssetGroup } from '../../types/entities';
import { useStorageProvider } from '../../hooks/useStorageProvider';
import { assetGroupKeys } from '../../hooks/useAssetGroups';
import { DEFAULT_ASSET_GROUP_INHERITANCE_RULES } from '../../services/asset-groups/constants';

interface ImportGroupSnapshotModalProps {
  group: AssetGroup;
  opened: boolean;
  onClose: () => void;
}

interface GroupSnapshot {
  version?: number;
  exportedAt?: string;
  group: {
    name?: string;
    description?: string;
    manufacturer?: string;
    model?: string;
    inheritanceRules?: AssetGroup['inheritanceRules'];
    customFieldRules?: AssetGroup['customFieldRules'];
    sharedCustomFields?: AssetGroup['sharedCustomFields'];
  };
  members?: Array<{ id: string; assetNumber?: string; name?: string }>;
}

export function ImportGroupSnapshotModal({ group, opened, onClose }: ImportGroupSnapshotModalProps) {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [removeMissing, setRemoveMissing] = useState(false);
  const [parsedSummary, setParsedSummary] = useState<{ memberCount: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const resetState = () => {
    setFile(null);
    setParsedSummary(null);
    setRemoveMissing(false);
    setIsImporting(false);
  };

  const handleParse = async (selected: File | null) => {
    setFile(selected);
    setParsedSummary(null);

    if (!selected) {
      return;
    }

    try {
      const text = await selected.text();
      const snapshot = JSON.parse(text) as GroupSnapshot;
      if (!snapshot.group) {
        throw new Error('Snapshot missing group data.');
      }
      const memberCount = snapshot.members?.length ?? 0;
      setParsedSummary({ memberCount });
    } catch (error) {
      notifications.show({
        title: 'Invalid snapshot',
        message: error instanceof Error ? error.message : 'Unable to parse the provided file.',
        color: 'red',
      });
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!provider) {
      notifications.show({
        title: 'Storage unavailable',
        message: 'Storage provider is not ready yet.',
        color: 'red',
      });
      return;
    }

    if (!file) {
      notifications.show({
        title: 'Select snapshot file',
        message: 'Choose a JSON snapshot exported from the asset models module.',
        color: 'yellow',
      });
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text) as GroupSnapshot;
      if (!snapshot.group) {
        throw new Error('Snapshot missing group configuration.');
      }

      const updatePayload = {
        description: snapshot.group.description ?? group.description,
        manufacturer: snapshot.group.manufacturer ?? group.manufacturer,
        model: snapshot.group.model ?? group.model,
        inheritanceRules: {
          ...DEFAULT_ASSET_GROUP_INHERITANCE_RULES,
          ...(snapshot.group.inheritanceRules ?? {}),
        },
        customFieldRules: snapshot.group.customFieldRules ?? group.customFieldRules,
        sharedCustomFields: snapshot.group.sharedCustomFields ?? group.sharedCustomFields,
      } satisfies Partial<AssetGroup>;

      await provider.updateAssetGroup(group.id, updatePayload);

      const memberIds = new Set(snapshot.members?.map((member) => member.id) ?? []);
      for (const assetId of memberIds) {
        try {
          await provider.addAssetToGroup(assetId, group.id);
        } catch (error) {
          console.warn('[ImportGroupSnapshotModal] Failed to add asset to group', { assetId, error });
        }
      }

      if (removeMissing) {
        const existingMembers = await provider.getGroupMembers(group.id);
        for (const member of existingMembers) {
          if (!memberIds.has(member.id)) {
            try {
              await provider.removeAssetFromGroup(member.id);
            } catch (error) {
              console.warn('[ImportGroupSnapshotModal] Failed to remove asset from group', { assetId: member.id, error });
            }
          }
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assetGroupKeys.detail(group.id) }),
        queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(group.id) }),
        queryClient.invalidateQueries({ queryKey: assetGroupKeys.lists() }),
      ]);

      notifications.show({
        title: 'Model imported',
        message: `Applied configuration and processed ${memberIds.size} member${memberIds.size === 1 ? '' : 's'}.`,
        color: 'green',
      });

      resetState();
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Unexpected error while importing snapshot.',
        color: 'red',
      });
      setIsImporting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        resetState();
        onClose();
      }}
  title={`Import snapshot into ${group.name}`}
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Upload a snapshot exported from another asset model to reuse its shared configuration and membership. Assets listed in the file must already exist in ChurchTools.
        </Text>

        <FileInput
          label="Snapshot file (.json)"
          placeholder="Select JSON snapshot"
          value={file}
          onChange={(selected) => { void handleParse(selected); }}
          accept="application/json"
          clearable
        />

        {parsedSummary && (
          <List spacing="xs" size="sm">
            <List.Item>{parsedSummary.memberCount} member{parsedSummary.memberCount === 1 ? '' : 's'} listed in snapshot</List.Item>
            <List.Item>Shared configuration will overwrite the current model settings</List.Item>
          </List>
        )}

        <Switch
          label="Remove members not present in snapshot"
          description="Useful when restoring a snapshot to a clean state."
          checked={removeMissing}
          onChange={(event) => setRemoveMissing(event.currentTarget.checked)}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={() => { resetState(); onClose(); }} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            leftSection={<IconUpload size={16} />}
            onClick={() => { void handleImport(); }}
            loading={isImporting}
            disabled={!file}
          >
            Import Snapshot
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
