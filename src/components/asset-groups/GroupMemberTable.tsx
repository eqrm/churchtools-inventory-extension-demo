import { ActionIcon, Badge, Card, Group, Skeleton, Stack, Table, Text, Tooltip } from '@mantine/core';
import { IconArrowsRightLeft, IconExternalLink, IconTrash } from '@tabler/icons-react';
import type { Asset } from '../../types/entities';
import { AssetStatusBadge } from '../assets/AssetStatusBadge';

interface GroupMemberTableProps {
  members: Asset[];
  loading?: boolean;
  onNavigate?: (assetId: string) => void;
  onRemoveMember?: (asset: Asset) => void;
  onMoveMember?: (asset: Asset) => void;
  emptyMessage?: string;
}

function getInheritedFieldCount(asset: Asset | undefined): number {
  if (!asset?.fieldSources) {
    return 0;
  }
  return Object.values(asset.fieldSources).filter((source) => source === 'group').length;
}

function getOverrideCount(asset: Asset | undefined): number {
  if (!asset?.fieldSources) {
    return 0;
  }
  return Object.values(asset.fieldSources).filter((source) => source === 'override').length;
}

export function GroupMemberTable({
  members,
  loading,
  onNavigate,
  onRemoveMember,
  onMoveMember,
  emptyMessage = 'No assets are assigned to this group yet.',
}: GroupMemberTableProps) {
  if (loading) {
    return (
      <Card withBorder>
        <Stack gap="sm">
          <Skeleton height={38} radius="sm" />
          <Skeleton height={38} radius="sm" />
          <Skeleton height={38} radius="sm" />
        </Stack>
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card withBorder>
        <Stack gap="xs" align="center" py="lg">
          <Text size="sm" c="dimmed">{emptyMessage}</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: '120px' }}>Asset #</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th style={{ width: '140px' }}>Status</Table.Th>
            <Table.Th style={{ width: '160px' }}>Location</Table.Th>
            <Table.Th style={{ width: '180px' }}>Group Fields</Table.Th>
            {(onNavigate || onRemoveMember || onMoveMember) && <Table.Th style={{ width: '120px' }}>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {members.map((asset) => {
            const inheritedCount = getInheritedFieldCount(asset);
            const overrideCount = getOverrideCount(asset);

            return (
              <Table.Tr key={asset.id}>
                <Table.Td>
                  <Text fw={500}>{asset.assetNumber}</Text>
                </Table.Td>
                <Table.Td>
                  <Stack gap={0}>
                    <Text>{asset.name}</Text>
                    {asset.assetGroup && (
                      <Text size="xs" c="dimmed">Member of {asset.assetGroup.name}</Text>
                    )}
                  </Stack>
                </Table.Td>
                <Table.Td>
                  <AssetStatusBadge status={asset.status} size="sm" />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={asset.location ? undefined : 'dimmed'}>
                    {asset.location ?? '—'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {inheritedCount > 0 && (
                      <Badge size="sm" color="grape" variant="light">
                        Inherited: {inheritedCount}
                      </Badge>
                    )}
                    {overrideCount > 0 && (
                      <Badge size="sm" color="yellow" variant="light">
                        Overrides: {overrideCount}
                      </Badge>
                    )}
                    {inheritedCount === 0 && overrideCount === 0 && (
                      <Badge size="sm" color="gray" variant="light">Local Only</Badge>
                    )}
                  </Group>
                </Table.Td>
                {(onNavigate || onRemoveMember || onMoveMember) && (
                  <Table.Td>
                    <Group gap="xs">
                      {onNavigate && (
                        <Tooltip label="View asset">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => onNavigate(asset.id)}
                            aria-label="View asset"
                          >
                            <IconExternalLink size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {onMoveMember && (
                        <Tooltip label="Move to another group">
                          <ActionIcon
                            variant="subtle"
                            color="violet"
                            onClick={() => onMoveMember(asset)}
                            aria-label="Move asset to another group"
                          >
                            <IconArrowsRightLeft size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {onRemoveMember && (
                        <Tooltip label="Remove from group">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => onRemoveMember(asset)}
                            aria-label="Remove from group"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                )}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Card>
  );
}
