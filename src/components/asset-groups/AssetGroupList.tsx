import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Menu,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconSearch, IconUsers, IconDots, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { AssetGroup, AssetGroupFilters } from '../../types/entities';
import { useAssetGroups, useDeleteAssetGroup } from '../../hooks/useAssetGroups';
import { useCategories } from '../../hooks/useCategories';
import { AssetGroupBadge } from './AssetGroupBadge';
import { EmptyState } from '../common/EmptyState';

interface AssetGroupListProps {
  onSelectGroup?: (group: AssetGroup) => void;
  onCreateGroup?: () => void;
  filters?: AssetGroupFilters;
  hideHeader?: boolean;
  selectedGroupId?: string | null;
}

export function AssetGroupList({ onSelectGroup, onCreateGroup, filters, hideHeader, selectedGroupId }: AssetGroupListProps) {
  const [search, setSearch] = useState(filters?.search ?? '');
  const mergedFilters = useMemo<AssetGroupFilters>(() => ({
    ...filters,
    search: search.trim() || undefined,
  }), [filters, search]);

  const { data: groups = [], isLoading } = useAssetGroups(mergedFilters);
  const { data: assetTypes = [] } = useCategories();
  const deleteAssetGroup = useDeleteAssetGroup();
  const [processingGroupId, setProcessingGroupId] = useState<string | null>(null);

  const assetTypeLookup = useMemo(() => {
    return new Map(assetTypes.map((assetType) => [assetType.id, assetType.name]));
  }, [assetTypes]);

  const inheritedFieldCount = (group: AssetGroup) => {
    return Object.values(group.inheritanceRules ?? {}).filter(rule => rule.inherited).length;
  };

  const handleSelect = (group: AssetGroup) => {
    if (onSelectGroup) {
      onSelectGroup(group);
    }
  };

  const handleDeleteGroup = async (group: AssetGroup) => {
    const confirmed = window.confirm(`Delete "${group.name}"?`);
    if (!confirmed) {
      return;
    }

    setProcessingGroupId(group.id);
    try {
      await deleteAssetGroup.mutateAsync(group.id);
      notifications.show({
        title: 'Deleted',
        message: `${group.name} removed`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed',
        color: 'red',
      });
    } finally {
      setProcessingGroupId(null);
    }
  };

  return (
    <Stack gap="sm">
      {!hideHeader && (
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Title order={4}>Asset Models</Title>
            <Text size="xs" c="dimmed">
              Reusable templates for shared settings
            </Text>
          </Stack>
          {onCreateGroup && (
            <Button size="sm" leftSection={<IconPlus size={14} />} onClick={onCreateGroup}>
              New
            </Button>
          )}
        </Group>
      )}

      <TextInput
        placeholder="Search..."
        leftSection={<IconSearch size={14} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        size="sm"
      />

      {isLoading && (
        <Grid gutter="sm">
          {Array.from({ length: 4 }).map((_, index) => (
            <Grid.Col key={index} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card withBorder p="sm">
                <Skeleton height={60} radius="sm" />
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}

      {!isLoading && groups.length === 0 && (
        <EmptyState
          title="No models"
          message="Create your first asset model to share fields across similar assets."
          action={onCreateGroup ? (
            <Button size="sm" leftSection={<IconPlus size={14} />} onClick={onCreateGroup}>
              Create
            </Button>
          ) : undefined}
        />
      )}

      {!isLoading && groups.length > 0 && (
        <Grid gutter="sm">
          {groups.map((group) => (
            <Grid.Col key={group.id} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card
                withBorder
                p="sm"
                radius="md"
                onClick={() => handleSelect(group)}
                style={{
                  cursor: onSelectGroup ? 'pointer' : 'default',
                  borderColor: selectedGroupId === group.id ? 'var(--mantine-color-blue-5)' : undefined,
                }}
              >
                <Stack gap="xs">
                  {/* Header Row */}
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <AssetGroupBadge group={group} withName size="sm" />
                    <Group gap={4}>
                      <Tooltip label={`${group.memberCount} units`}>
                        <Badge size="xs" variant="light" color="gray" leftSection={<IconUsers size={10} />}>
                          {group.memberCount}
                        </Badge>
                      </Tooltip>
                      <Menu withinPortal position="bottom-end">
                        <Menu.Target>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <IconDots size={14} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconTrash size={12} />}
                            color="red"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteGroup(group);
                            }}
                            disabled={processingGroupId === group.id}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>

                  {/* Name & Info */}
                  <Stack gap={2}>
                    <Text size="sm" fw={500} lineClamp={1}>{group.name}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {group.manufacturer ?? ''}{group.manufacturer && group.model ? ' · ' : ''}{group.model ?? 'No model'}
                    </Text>
                  </Stack>

                  {/* Tags Row */}
                  <Group gap={4} wrap="wrap">
                    <Badge size="xs" variant="light" color="blue">
                      {assetTypeLookup.get(group.assetType.id) ?? group.assetType.name}
                    </Badge>
                    {inheritedFieldCount(group) > 0 && (
                      <Tooltip label="Inherited fields">
                        <Badge size="xs" variant="dot" color="grape">
                          {inheritedFieldCount(group)}
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
