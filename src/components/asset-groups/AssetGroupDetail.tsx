import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  AspectRatio,
  Badge,
  Box,
  Button,
  Card,
  Image,
  Grid,
  Group,
  Menu,
  Modal,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconEdit,
  IconDots,
  IconAdjustments,
  IconCalendarEvent,
  IconPlus,
  IconTrashX,
  IconRefresh,
  IconDownload,
  IconUpload,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { Asset, AssetGroup } from '../../types/entities';
import {
  useAssetGroups,
  useAssetGroup,
  useDissolveAssetGroup,
  useGroupMembers,
  useRegenerateAssetGroupBarcode,
  useRemoveAssetFromGroup,
} from '../../hooks/useAssetGroups';
import { useCategories } from '../../hooks/useCategories';
import { useAssets } from '../../hooks/useAssets';
import { AssetGroupBadge } from './AssetGroupBadge';
import { GroupMemberTable } from './GroupMemberTable';
import { InheritanceRuleEditor } from './InheritanceRuleEditor';
import { AddAssetsToGroupModal } from './AddAssetsToGroupModal';
import { BulkUpdateMembersModal } from './BulkUpdateMembersModal';
import { GroupBookingModal } from './GroupBookingModal';
import { GroupStatusSummary } from './GroupStatusSummary';
import { ReassignMemberModal } from './ReassignMemberModal';
import { ImportGroupSnapshotModal } from './ImportGroupSnapshotModal';
import { BarcodeDisplay } from '../scanner/BarcodeDisplay';

interface AssetGroupDetailProps {
  groupId: string;
  onEditGroup?: (group: AssetGroup) => void;
  onGroupCleared?: () => void;
}

function formatCustomFieldValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}

export function AssetGroupDetail({ groupId, onEditGroup, onGroupCleared }: AssetGroupDetailProps) {
  const navigate = useNavigate();
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [moveMember, setMoveMember] = useState<Asset | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [regenerateReason, setRegenerateReason] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateLabel, setDuplicateLabel] = useState<string | null>(null);
  const { data: group, isLoading: isGroupLoading } = useAssetGroup(groupId);
  const { data: members = [], isLoading: isMembersLoading } = useGroupMembers(groupId);
  const { data: assetTypes = [] } = useCategories();
  const { data: allAssets = [] } = useAssets();
  const { data: allGroups = [] } = useAssetGroups();
  const removeAssetFromGroup = useRemoveAssetFromGroup();
  const dissolveGroup = useDissolveAssetGroup();
  const regenerateBarcode = useRegenerateAssetGroupBarcode();

  const assetTypeDefinition = useMemo(
    () => assetTypes.find(type => type.id === group?.assetType.id),
    [assetTypes, group?.assetType.id],
  );

  useEffect(() => {
    if (!group) {
      return;
    }

    const candidate = scannedBarcode.trim();
    if (!candidate) {
      setIsDuplicate(false);
      setDuplicateLabel(null);
      return;
    }

    const conflictingAsset = allAssets.find((asset) => asset.barcode === candidate);
    if (conflictingAsset) {
      setIsDuplicate(true);
      setDuplicateLabel(`${conflictingAsset.name} (${conflictingAsset.assetNumber})`);
      return;
    }

    const conflictingGroup = allGroups.find((existing) => existing.id !== group.id && existing.barcode === candidate);
    if (conflictingGroup) {
      const label = conflictingGroup.groupNumber ? `${conflictingGroup.groupNumber} (${conflictingGroup.name})` : conflictingGroup.name;
      setIsDuplicate(true);
      setDuplicateLabel(label);
      return;
    }

    setIsDuplicate(false);
    setDuplicateLabel(null);
  }, [scannedBarcode, allAssets, allGroups, group]);

  const handleRemoveMember = async (asset: Asset) => {
    try {
      await removeAssetFromGroup.mutateAsync(asset.id);
      notifications.show({
        title: 'Asset removed',
        message: `"${asset.name}" is no longer part of ${group?.name ?? 'this model'}.`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Unable to remove asset',
        message: error instanceof Error ? error.message : 'Unexpected error occurred.',
        color: 'red',
      });
    }
  };

  const resetBarcodeDialogState = () => {
    setRegenerateModalOpen(false);
    setScannedBarcode('');
    setRegenerateReason('');
    setIsDuplicate(false);
    setDuplicateLabel(null);
  };

  const handleRegenerateBarcode = () => {
    if (!group) {
      return;
    }

    const candidate = scannedBarcode.trim();
    if (!candidate) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a barcode value first.',
        color: 'red',
      });
      return;
    }

    if (isDuplicate) {
      notifications.show({
        title: 'Duplicate barcode',
        message: duplicateLabel ? `Already used by ${duplicateLabel}` : 'This barcode is already in use.',
        color: 'red',
      });
      return;
    }

    regenerateBarcode.mutate(
      { id: group.id, reason: regenerateReason || undefined, newBarcode: candidate },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Barcode reassigned',
            message: `${group.name} now uses the new barcode.`,
            color: 'green',
          });
          resetBarcodeDialogState();
        },
        onError: (error) => {
          notifications.show({
            title: 'Unable to reassign barcode',
            message: error instanceof Error ? error.message : 'Unexpected error occurred.',
            color: 'red',
          });
        },
      },
    );
  };

  const handleDissolveGroup = async () => {
    if (!group) {
      return;
    }

    const confirmed = confirm(`Remove all members from ${group.name}? Assets keep their own data.`);
    if (!confirmed) {
      return;
    }

    try {
      await dissolveGroup.mutateAsync(group.id);
      notifications.show({
        title: 'Model cleared',
        message: `${group.name} no longer has assigned members.`,
        color: 'green',
      });
      onGroupCleared?.();
    } catch (error) {
      notifications.show({
        title: 'Unable to clear model',
        message: error instanceof Error ? error.message : 'Unexpected error occurred.',
        color: 'red',
      });
    }
  };

  const handleExportSnapshot = () => {
    if (!group) {
      return;
    }

    const snapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      group: {
        id: group.id,
        name: group.name,
        groupNumber: group.groupNumber,
        description: group.description,
        assetType: group.assetType,
        manufacturer: group.manufacturer,
        model: group.model,
        inheritanceRules: group.inheritanceRules,
        customFieldRules: group.customFieldRules,
        sharedCustomFields: group.sharedCustomFields,
      },
      members: members.map((asset) => ({
        id: asset.id,
        assetNumber: asset.assetNumber,
        name: asset.name,
        status: asset.status,
      })),
    };

    const fileName = `${group.groupNumber || group.name}-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    notifications.show({
      title: 'Snapshot exported',
      message: `${members.length} member${members.length === 1 ? '' : 's'} captured in JSON.`,
      color: 'green',
    });
  };

  if (isGroupLoading || !group) {
    return (
      <Card withBorder>
        <Stack gap="md">
          <Skeleton height={28} radius="sm" />
          <Skeleton height={18} radius="sm" />
          <Skeleton height={220} radius="md" />
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="sm">
      {/* Header Card - Compact */}
      <Card withBorder p="sm">
        {group.mainImage && (
          <Card.Section mb="sm">
            <AspectRatio ratio={21 / 9}>
              <Image
                src={group.mainImage}
                alt={`${group.name}`}
                fit="cover"
              />
            </AspectRatio>
          </Card.Section>
        )}
        
        <Stack gap="sm">
          {/* Title Row */}
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <AssetGroupBadge group={group} withName />
              <Title order={4}>{group.name}</Title>
              {group.description && (
                <Text size="xs" c="dimmed" lineClamp={2}>{group.description}</Text>
              )}
            </Stack>
            
            {/* Action Buttons - Icon-based */}
            <Group gap={4}>
              <Tooltip label="Add assets">
                <ActionIcon variant="light" onClick={() => setAddMembersOpen(true)}>
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
              <Menu shadow="md" position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="subtle">
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconAdjustments size={14} />}
                    onClick={() => setBulkUpdateOpen(true)}
                  >
                    Bulk update
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconCalendarEvent size={14} />}
                    onClick={() => setBookingModalOpen(true)}
                  >
                    Book assets
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconDownload size={14} />}
                    onClick={() => handleExportSnapshot()}
                  >
                    Export
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconUpload size={14} />}
                    onClick={() => setImportModalOpen(true)}
                  >
                    Import
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconTrashX size={14} />}
                    color="red"
                    onClick={() => { void handleDissolveGroup(); }}
                  >
                    Remove all
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              {onEditGroup && (
                <Tooltip label="Edit">
                  <ActionIcon variant="default" onClick={() => onEditGroup(group)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          </Group>

          {/* Info Row - Compact Badges */}
          <Group gap={4} wrap="wrap">
            <Badge size="xs" variant="light" color="blue">
              {assetTypeDefinition?.name ?? group.assetType.name}
            </Badge>
            {group.manufacturer && (
              <Badge size="xs" variant="light" color="grape">{group.manufacturer}</Badge>
            )}
            {group.model && (
              <Badge size="xs" variant="light" color="teal">{group.model}</Badge>
            )}
            <Badge size="xs" variant="light" color="gray">
              {group.memberCount} units
            </Badge>
          </Group>

          {/* Barcode & Inherited Fields - Side by Side */}
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Stack gap={4}>
                <Text size="xs" fw={500}>Barcode</Text>
                {group.barcode ? (
                  <Group gap="xs" align="flex-end">
                    <Box style={{ border: '1px solid var(--mantine-color-gray-3)', padding: 4, borderRadius: 4, background: '#fff' }}>
                      <BarcodeDisplay value={group.barcode} alt={group.barcode} width={120} />
                    </Box>
                    <Tooltip label="Reassign">
                      <ActionIcon
                        size="xs"
                        variant="light"
                        color="orange"
                        onClick={() => {
                          setRegenerateModalOpen(true);
                          setScannedBarcode('');
                          setRegenerateReason('');
                        }}
                      >
                        <IconRefresh size={12} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ) : (
                  <Button
                    size="xs"
                    variant="light"
                    color="orange"
                    leftSection={<IconRefresh size={12} />}
                    onClick={() => setRegenerateModalOpen(true)}
                  >
                    Assign
                  </Button>
                )}
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Stack gap={4}>
                <Text size="xs" fw={500}>Inherited</Text>
                <Text size="xs" c="dimmed">
                  {Object.values(group.inheritanceRules ?? {}).filter(rule => rule.inherited).length} fields shared
                </Text>
              </Stack>
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>

      {/* Barcode History - Compact */}
      {group.barcodeHistory && group.barcodeHistory.length > 0 && (
        <Card withBorder p="sm">
          <Stack gap="xs">
            <Text size="xs" fw={600}>Barcode History</Text>
            {[...group.barcodeHistory].reverse().slice(0, 3).map((entry, index) => (
              <Group key={`${entry.barcode}-${entry.generatedAt}-${index}`} justify="space-between" gap="xs">
                <Text size="xs" fw={500}>{entry.barcode || '—'}</Text>
                <Text size="xs" c="dimmed">
                  {new Date(entry.generatedAt).toLocaleDateString()}
                </Text>
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      {/* Status Summary - Compact */}
      <GroupStatusSummary members={members} />

      {/* Member Table */}
      <GroupMemberTable
        members={members}
        loading={isMembersLoading}
        onNavigate={(assetId) => navigate(`/assets/${assetId}`)}
        onRemoveMember={(asset) => {
          if (
            confirm(`Remove ${asset.name} from ${group.name}?`)
          ) {
            void handleRemoveMember(asset);
          }
        }}
        onMoveMember={(asset) => setMoveMember(asset)}
      />

      {/* Inheritance & Custom Fields - Side by Side */}
      <Grid gutter="sm">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <InheritanceRuleEditor
            rules={group.inheritanceRules ?? {}}
            customFieldRules={group.customFieldRules ?? {}}
            customFieldDefinitions={assetTypeDefinition?.customFields}
            readOnly
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder p="sm">
            <Stack gap="xs">
              <Text size="xs" fw={600}>Shared Fields</Text>
              {group.sharedCustomFields && Object.keys(group.sharedCustomFields).length > 0 ? (
                Object.entries(group.sharedCustomFields).map(([fieldId, value]) => {
                  const definition = assetTypeDefinition?.customFields.find((field) => field.id === fieldId);
                  return (
                    <Group key={fieldId} justify="space-between" gap="xs">
                      <Text size="xs">{definition?.name ?? fieldId}</Text>
                      <Text size="xs" c="dimmed">{formatCustomFieldValue(value)}</Text>
                    </Group>
                  );
                })
              ) : (
                <Text size="xs" c="dimmed">None configured</Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <Modal
        opened={regenerateModalOpen}
        onClose={resetBarcodeDialogState}
        title="Reassign Barcode"
        centered
        size="sm"
      >
        <Stack gap="sm">
          {group.barcode && (
            <Box style={{ border: '1px solid var(--mantine-color-gray-3)', padding: 8, borderRadius: 6, background: '#f8f9fa', display: 'flex', justifyContent: 'center' }}>
              <BarcodeDisplay value={group.barcode} alt="Current" width={140} />
            </Box>
          )}

          <TextInput
            label="New barcode"
            placeholder="Scan or type"
            value={scannedBarcode}
            onChange={(event) => setScannedBarcode(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleRegenerateBarcode();
              }
            }}
            size="sm"
            rightSection={scannedBarcode ? (
              isDuplicate ? <Badge color="red" size="xs">Used</Badge> : <Badge color="green" size="xs">OK</Badge>
            ) : undefined}
            error={isDuplicate && duplicateLabel ? `Used by ${duplicateLabel}` : undefined}
          />

          <Textarea
            label="Reason"
            placeholder="Optional"
            value={regenerateReason}
            onChange={(event) => setRegenerateReason(event.currentTarget.value)}
            size="sm"
            minRows={1}
          />

          <Group justify="flex-end" gap="xs">
            <Button size="xs" variant="default" onClick={resetBarcodeDialogState}>
              Cancel
            </Button>
            <Button
              size="xs"
              color="orange"
              leftSection={<IconRefresh size={14} />}
              onClick={handleRegenerateBarcode}
              disabled={!scannedBarcode.trim() || isDuplicate}
              loading={regenerateBarcode.isPending}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <AddAssetsToGroupModal
        opened={addMembersOpen}
        onClose={() => setAddMembersOpen(false)}
        group={group}
        onAdded={() => {
          setAddMembersOpen(false);
        }}
      />

      <BulkUpdateMembersModal
        group={group}
        opened={bulkUpdateOpen}
        onClose={() => setBulkUpdateOpen(false)}
        onCompleted={() => setBulkUpdateOpen(false)}
      />

      <GroupBookingModal
        group={group}
        members={members}
        opened={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onCompleted={() => setBookingModalOpen(false)}
      />

      <ReassignMemberModal
        asset={moveMember}
        currentGroup={group}
        opened={Boolean(moveMember)}
        onClose={() => setMoveMember(null)}
        onReassigned={() => setMoveMember(null)}
      />

      <ImportGroupSnapshotModal
        group={group}
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </Stack>
  );
}
