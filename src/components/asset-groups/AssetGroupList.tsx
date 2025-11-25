import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconPlus, IconSearch, IconUsers } from '@tabler/icons-react';
import type { AssetGroup, AssetGroupFilters } from '../../types/entities';
import { useAssetGroups } from '../../hooks/useAssetGroups';
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

  return (
    <Stack gap="md">
      {!hideHeader && (
        <Group justify="space-between" align="flex-end">
          <Stack gap={4}>
            <Title order={3}>Asset Models</Title>
            <Text size="sm" c="dimmed">
              Organize identical assets into reusable templates for shared settings.
            </Text>
          </Stack>
          {onCreateGroup && (
            <Button leftSection={<IconPlus size={16} />} onClick={onCreateGroup}>
              New Asset Model
            </Button>
          )}
        </Group>
      )}

      <TextInput
        placeholder="Search asset models"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      {isLoading && (
        <Grid>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid.Col key={index} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card withBorder h="100%">
                <Stack gap="sm">
                  <Skeleton height={16} radius="sm" />
                  <Skeleton height={28} radius="sm" />
                  <Skeleton height={12} radius="sm" />
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}

      {!isLoading && groups.length === 0 && (
        <EmptyState
          title="No asset models"
          message="Create your first asset model to start sharing fields across similar assets."
          action={onCreateGroup ? (
            <Button leftSection={<IconPlus size={16} />} onClick={onCreateGroup}>
              Create Asset Model
            </Button>
          ) : undefined}
        />
      )}

      {!isLoading && groups.length > 0 && (
        <Grid>
          {groups.map((group) => (
            <Grid.Col key={group.id} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card
                withBorder
                shadow={selectedGroupId === group.id ? 'md' : 'sm'}
                radius="md"
                h="100%"
                onClick={() => handleSelect(group)}
                style={{
                  cursor: onSelectGroup ? 'pointer' : 'default',
                  borderColor: selectedGroupId === group.id ? 'var(--mantine-color-blue-5)' : undefined,
                }}
                data-selected={selectedGroupId === group.id}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <AssetGroupBadge group={group} withName data-testid={`asset-group-${group.id}`} />
                    <Badge variant="light" color="gray" leftSection={<IconUsers size={14} />}>
                      {group.memberCount} members
                    </Badge>
                  </Group>

                  <Stack gap={2}>
                    <Text fw={500}>{group.name}</Text>
                    <Text size="sm" c="dimmed">
                      {group.manufacturer ? `${group.manufacturer} • ` : ''}
                      {group.model ?? 'Model not set'}
                    </Text>
                  </Stack>

                  <Group gap="xs">
                    <Badge variant="light" color="blue">
                      {assetTypeLookup.get(group.assetType.id) ?? group.assetType.name}
                    </Badge>
                    <Badge variant="light" color="grape">
                      {inheritedFieldCount(group)} inherited fields
                    </Badge>
                    {group.sharedCustomFields && Object.keys(group.sharedCustomFields).length > 0 && (
                      <Badge variant="light" color="teal">
                        Custom shared: {Object.keys(group.sharedCustomFields).length}
                      </Badge>
                    )}
                  </Group>

                  {group.description && (
                    <Text size="sm" c="dimmed" lineClamp={3}>
                      {group.description}
                    </Text>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
