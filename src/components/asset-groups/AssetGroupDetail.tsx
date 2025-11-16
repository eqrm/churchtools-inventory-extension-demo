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
    <Stack gap="md">
      <Card withBorder>
        {group.mainImage && (
          <Card.Section>
            <AspectRatio ratio={16 / 9}>
              <Image
                src={group.mainImage}
                alt={`${group.name} main visual`}
                fit="cover"
              />
            </AspectRatio>
          </Card.Section>
        )}
        <Card.Section inheritPadding>
          <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs">
              <AssetGroupBadge group={group} withName />
              <Title order={3}>{group.name}</Title>
              {group.description && (
                <Text size="sm" c="dimmed">{group.description}</Text>
              )}
              <Group gap="xs">
                <Badge variant="light" color="blue">
                  {assetTypeDefinition?.name ?? group.assetType.name}
                </Badge>
                {group.manufacturer && (
                  <Badge variant="light" color="grape">{group.manufacturer}</Badge>
                )}
                {group.model && (
                  <Badge variant="light" color="teal">{group.model}</Badge>
                )}
                <Badge variant="light" color="gray">
                  {group.memberCount} members
                </Badge>
              </Group>
            </Stack>
            <Group gap="xs">
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => setAddMembersOpen(true)}
              >
                Add Assets
              </Button>
              <Menu shadow="md" position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="outline" aria-label="More actions">
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconAdjustments size={16} />}
                    onClick={() => setBulkUpdateOpen(true)}
                  >
                    Bulk update assets
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconCalendarEvent size={16} />}
                    onClick={() => setBookingModalOpen(true)}
                  >
                    Book assets
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconDots size={16} />}
                    onClick={() => handleExportSnapshot()}
                  >
                    Export model snapshot
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconDots size={16} />}
                    onClick={() => setImportModalOpen(true)}
                  >
                    Import model snapshot
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconTrashX size={16} />}
                    color="red"
                    onClick={() => { void handleDissolveGroup(); }}
                  >
                    Remove all members
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              {onEditGroup && (
                <Button
                  variant="outline"
                  leftSection={<IconEdit size={16} />}
                  onClick={() => onEditGroup(group)}
                >
                  Edit Model
                </Button>
              )}
            </Group>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="xs">
                <Text fw={500}>Barcode</Text>
                {group.barcode ? (
                  <Stack gap="xs">
                    <Box style={{ border: '1px solid #e9ecef', padding: '12px', borderRadius: '8px', backgroundColor: '#fff', maxWidth: 220 }}>
                      <BarcodeDisplay value={group.barcode} alt={`Barcode for ${group.name}`} width={180} />
                    </Box>
                    <Text size="sm" c="dimmed">Current code: {group.barcode}</Text>
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">
                    No barcode assigned yet. Use the button below to connect this model to a scanner-friendly code.
                  </Text>
                )}
                <Button
                  size="xs"
                  variant="light"
                  color="orange"
                  leftSection={<IconRefresh size={14} />}
                  onClick={() => {
                    setRegenerateModalOpen(true);
                    setScannedBarcode('');
                    setRegenerateReason('');
                    setIsDuplicate(false);
                    setDuplicateLabel(null);
                  }}
                >
                  {group.barcode ? 'Reassign Barcode' : 'Assign Barcode'}
                </Button>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="xs">
                <Text fw={500}>Shared by default</Text>
                <Text size="sm" c="dimmed">
                  {Object.values(group.inheritanceRules ?? {}).filter(rule => rule.inherited).length} fields inherited
                </Text>
              </Stack>
            </Grid.Col>
          </Grid>
        </Stack>
        </Card.Section>
      </Card>

      {group.barcodeHistory && group.barcodeHistory.length > 0 && (
        <Card withBorder>
          <Stack gap="sm">
            <Title order={5}>Barcode History</Title>
            <Stack gap="xs">
              {[...group.barcodeHistory].reverse().map((entry, index) => (
                <Group key={`${entry.barcode}-${entry.generatedAt}-${index}`} justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Text fw={500}>{entry.barcode || '—'}</Text>
                    {entry.reason && (
                      <Text size="xs" c="dimmed">{entry.reason}</Text>
                    )}
                  </Stack>
                  <Stack gap={2} align="flex-end">
                    <Text size="xs" c="dimmed">{new Date(entry.generatedAt).toLocaleString()}</Text>
                    <Text size="xs" c="dimmed">
                      by {entry.generatedByName ?? entry.generatedBy}
                    </Text>
                  </Stack>
                </Group>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      <GroupStatusSummary members={members} />

      <GroupMemberTable
        members={members}
        loading={isMembersLoading}
        onNavigate={(assetId) => navigate(`/assets/${assetId}`)}
        onRemoveMember={(asset) => {
          if (
            confirm(`Remove ${asset.name} from ${group.name}? Members will keep their individual data.`)
          ) {
            void handleRemoveMember(asset);
          }
        }}
        onMoveMember={(asset) => setMoveMember(asset)}
      />

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <InheritanceRuleEditor
            rules={group.inheritanceRules ?? {}}
            customFieldRules={group.customFieldRules ?? {}}
            customFieldDefinitions={assetTypeDefinition?.customFields}
            readOnly
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder>
            <Stack gap="sm">
              <Title order={5}>Shared Custom Fields</Title>
              {group.sharedCustomFields && Object.keys(group.sharedCustomFields).length > 0 ? (
                Object.entries(group.sharedCustomFields).map(([fieldId, value]) => {
                  const definition = assetTypeDefinition?.customFields.find((field) => field.id === fieldId);
                  return (
                    <Stack key={fieldId} gap={2}>
                      <Text fw={500}>{definition?.name ?? fieldId}</Text>
                      <Text size="sm" c="dimmed">{formatCustomFieldValue(value)}</Text>
                    </Stack>
                  );
                })
              ) : (
                <Text size="sm" c="dimmed">No shared custom fields configured.</Text>
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
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Scan or type the new barcode for this asset model. Duplicates across assets and models are blocked automatically.
          </Text>

          {group.barcode && (
            <Box style={{ border: '1px solid #e9ecef', padding: '12px', borderRadius: '8px', backgroundColor: '#f8f9fa', maxWidth: 220 }}>
              <BarcodeDisplay value={group.barcode} alt="Current barcode" width={180} />
            </Box>
          )}

          <TextInput
            label="New barcode"
            placeholder="Scan or enter new code"
            value={scannedBarcode}
            onChange={(event) => setScannedBarcode(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleRegenerateBarcode();
              }
            }}
            rightSection={scannedBarcode ? (
              isDuplicate ? <Badge color="red" size="sm">Duplicate</Badge> : <Badge color="green" size="sm">Available</Badge>
            ) : undefined}
            error={isDuplicate && duplicateLabel ? `Already used by ${duplicateLabel}` : undefined}
          />

          <Textarea
            label="Reason (optional)"
            placeholder="Why is this barcode changing?"
            value={regenerateReason}
            onChange={(event) => setRegenerateReason(event.currentTarget.value)}
            minRows={2}
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={resetBarcodeDialogState}>
              Cancel
            </Button>
            <Button
              color="orange"
              leftSection={<IconRefresh size={16} />}
              onClick={handleRegenerateBarcode}
              disabled={!scannedBarcode.trim() || isDuplicate}
              loading={regenerateBarcode.isPending}
            >
              Save Barcode
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
