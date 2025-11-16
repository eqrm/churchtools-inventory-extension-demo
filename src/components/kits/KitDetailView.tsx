import type { ReactNode } from 'react';
import { useState } from 'react';
import { Badge, Button, Card, Divider, Group, Skeleton, Stack, Table, Text, Title } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import type { Kit } from '../../types/entities';
import { useKitSubAssets } from '../../hooks/useKits';
import { PropertyInheritanceIndicator } from './PropertyInheritanceIndicator';
import { ASSET_STATUS_LABELS, ASSET_STATUS_KANBAN_COLORS } from '../../constants/assetStatuses';
import { TagInput } from '../tags/TagInput';
import { TagListWithInheritance } from '../tags/InheritedTagBadge';
import { TagPropagationConfirmation } from '../tags/TagPropagationConfirmation';
import { useTags, useEntityTags, useKitTagPropagation } from '../../hooks/useTags';

interface KitDetailViewProps {
  kit: Kit;
  onOpenBooking?: () => void;
  onEdit?: () => void;
  onDisassemble?: () => void;
  disassembleDisabled?: boolean;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function renderTagSummary(kit: Kit, t: (key: string, options?: Record<string, unknown>) => string): ReactNode {
  const direct = kit.tags?.length ?? 0;
  const inheritsTags = kit.inheritedProperties?.includes('tags');

  if (direct === 0 && !inheritsTags) {
    return <Text size="sm" c="dimmed">—</Text>;
  }

  return (
    <Group gap={6} wrap="wrap">
      {direct > 0 && <Badge variant="light">{t('detail.tags.directBadge', { count: direct })}</Badge>}
      {inheritsTags && (
        <Badge color="blue" variant="light">
          {t('detail.tags.inheritedBadge')}
        </Badge>
      )}
    </Group>
  );
}

export function KitDetailView({ kit, onEdit, onOpenBooking, onDisassemble, disassembleDisabled }: KitDetailViewProps) {
  const { t } = useTranslation('kits');
  const { t: tTags } = useTranslation('tags');
  const isFixed = kit.type === 'fixed';
  const { data: subAssets = [], isLoading: subAssetsLoading } = useKitSubAssets(isFixed ? kit.id : undefined);
  const inheritance = kit.inheritedProperties ?? [];
  const completeness = kit.completenessStatus ?? 'complete';

  // Tags state and hooks
  const [propagationModalOpened, setPropagationModalOpened] = useState(false);
  const [pendingTagIds, setPendingTagIds] = useState<string[]>([]);
  const { tags: allTags = [], isLoading: tagsLoading } = useTags();
  const {
    tags: entityTags,
    applyTag,
    removeTag,
    isApplying,
    isRemoving,
  } = useEntityTags('kit', kit.id);
  const { propagateTags, isPropagating } = useKitTagPropagation(kit.id);

  const handleTagsChange = async (tagIds: string[]) => {
    const currentIds = entityTags.map((t) => t.id);
    const hasInheritedTags = kit.inheritedProperties?.includes('tags');
    const subAssetCount = subAssets.length;

    // If kit inherits tags to sub-assets and has sub-assets, show confirmation
    if (hasInheritedTags && subAssetCount > 0) {
      setPendingTagIds(tagIds);
      setPropagationModalOpened(true);
    } else {
      // Otherwise, apply tags directly without propagation
      await applyTagsDirectly(tagIds, currentIds);
    }
  };

  const applyTagsDirectly = async (tagIds: string[], currentIds: string[]) => {
    try {
      const toAdd = tagIds.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id) => !tagIds.includes(id));

      for (const tagId of toAdd) {
        await applyTag(tagId);
      }

      for (const tagId of toRemove) {
        await removeTag(tagId);
      }

      notifications.show({
        title: tTags('notifications.tagsUpdatedTitle'),
        message: tTags('notifications.tagsUpdatedMessage'),
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: tTags('notifications.updateErrorTitle'),
        message: error instanceof Error ? error.message : tTags('notifications.updateErrorMessage'),
        color: 'red',
      });
    }
  };

  const handlePropagationConfirm = async () => {
    const currentIds = entityTags.map((t) => t.id);
    
    try {
      // Apply tags to kit first
      await applyTagsDirectly(pendingTagIds, currentIds);

      // Propagate to sub-assets
      await propagateTags(pendingTagIds);

      notifications.show({
        title: tTags('notifications.tagsPropagatedTitle'),
        message: tTags('notifications.tagsPropagated', { count: subAssets.length, targetType: tTags('subAssets') }),
        color: 'green',
      });

      setPropagationModalOpened(false);
      setPendingTagIds([]);
    } catch (error) {
      notifications.show({
        title: tTags('notifications.updateErrorTitle'),
        message: error instanceof Error ? error.message : tTags('notifications.updateErrorMessage'),
        color: 'red',
      });
    }
  };

  const handlePropagationSkip = async () => {
    const currentIds = entityTags.map((t) => t.id);
    
    // Just apply tags to kit without propagation
    await applyTagsDirectly(pendingTagIds, currentIds);
    
    setPropagationModalOpened(false);
    setPendingTagIds([]);
  };

  return (
    <Stack gap="lg">
      <TagPropagationConfirmation
        opened={propagationModalOpened}
        onClose={() => {
          setPropagationModalOpened(false);
          setPendingTagIds([]);
        }}
        onConfirm={handlePropagationConfirm}
        onSkip={handlePropagationSkip}
        entityType="kit"
        affectedCount={subAssets.length}
        isLoading={isPropagating}
      />

      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{kit.name}</Title>
          {kit.description && <Text c="dimmed">{kit.description}</Text>}
          <Group gap="xs">
            <Badge color={kit.type === 'fixed' ? 'blue' : 'teal'} variant="light">
              {kit.type === 'fixed' ? t('detail.typeFixed') : t('detail.typeFlexible')}
            </Badge>
            {kit.status && (
              <Badge color={ASSET_STATUS_KANBAN_COLORS[kit.status] ?? 'gray'} variant="light">
                {ASSET_STATUS_LABELS[kit.status] ?? kit.status}
              </Badge>
            )}
            <Badge color={completeness === 'complete' ? 'green' : 'red'} variant="light">
              {completeness === 'complete'
                ? t('detail.completenessComplete')
                : t('detail.completenessIncomplete')}
            </Badge>
          </Group>
        </Stack>
        <Group gap="sm">
          {onOpenBooking && (
            <Button color="green" onClick={onOpenBooking}>
              {t('detail.actions.book')}
            </Button>
          )}
          {onEdit && (
            <Button variant="default" onClick={onEdit}>
              {t('detail.actions.edit')}
            </Button>
          )}
          {isFixed && !kit.disassemblyDate && onDisassemble && (
            <Button
              color="red"
              variant="light"
              onClick={onDisassemble}
              loading={disassembleDisabled}
              disabled={disassembleDisabled}
            >
              {t('detail.actions.disassemble')}
            </Button>
          )}
        </Group>
      </Group>

      <Card withBorder>
        <Stack gap="md">
          <Title order={4}>{t('detail.overviewTitle')}</Title>
          <Divider />
          <Group gap="xl" align="flex-start" wrap="wrap">
            <Stack gap={4}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {t('detail.locationLabel')}
              </Text>
              <Text size="sm">{kit.location || t('detail.locationUnset')}</Text>
            </Stack>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {t('detail.tagsLabel')}
              </Text>
              {renderTagSummary(kit, t)}
            </Stack>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {t('detail.completenessLabel')}
              </Text>
              <Text size="sm">
                {completeness === 'complete'
                  ? t('detail.completenessComplete')
                  : t('detail.completenessIncomplete')}
              </Text>
            </Stack>
          </Group>

          <Stack gap={8}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              {t('detail.inheritanceHeading')}
            </Text>
            {inheritance.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t('detail.inheritanceEmpty')}
              </Text>
            ) : (
              <Group gap="xs" wrap="wrap">
                {inheritance.map((property) => (
                  <Badge key={property} variant="outline">
                    {t(`form.inheritance.${property}`)}
                  </Badge>
                ))}
              </Group>
            )}
          </Stack>

          {(kit.assemblyDate || kit.disassemblyDate) && (
            <Group gap="xl" align="center">
              {kit.assemblyDate && (
                <Group gap="xs" align="center">
                  <IconCalendar size={16} />
                  <Text size="sm" c="dimmed">
                    {t('detail.timestamps.assembled', { date: formatDate(kit.assemblyDate) })}
                  </Text>
                </Group>
              )}
              {kit.disassemblyDate && (
                <Group gap="xs" align="center">
                  <IconCalendar size={16} />
                  <Text size="sm" c="dimmed">
                    {t('detail.timestamps.disassembled', { date: formatDate(kit.disassemblyDate) })}
                  </Text>
                </Group>
              )}
            </Group>
          )}
        </Stack>
      </Card>

      {/* Tags Card */}
      <Card withBorder>
        <Stack gap="md">
          <Title order={4}>{tTags('title')}</Title>
          <Divider />

          {/* Tag Input for adding/removing tags */}
          <TagInput
            tags={allTags}
            selectedTagIds={entityTags.map((t) => t.id)}
            onChange={handleTagsChange}
            disabled={isApplying || isRemoving}
            isLoading={tagsLoading}
            label={tTags('selectTags')}
            placeholder={tTags('searchOrCreateTag')}
          />

          {/* Display tags with inheritance indicators */}
          {entityTags.length > 0 && (
            <Stack gap="xs">
              <TagListWithInheritance
                directTags={entityTags}
                inheritedTags={[]} // Kits don't inherit tags, they propagate to sub-assets
                onRemoveDirectTag={async (tagId) => {
                  try {
                    await removeTag(tagId);
                    notifications.show({
                      title: tTags('notifications.removedTitle'),
                      message: tTags('notifications.removedMessage'),
                      color: 'green',
                    });
                  } catch (error) {
                    notifications.show({
                      title: tTags('notifications.removeErrorTitle'),
                      message: error instanceof Error ? error.message : tTags('notifications.removeErrorMessage'),
                      color: 'red',
                    });
                  }
                }}
                disabled={isRemoving}
                size="md"
                showLabels
              />
            </Stack>
          )}

          {entityTags.length === 0 && (
            <Text size="sm" c="dimmed">
              {tTags('emptyState.description')}
            </Text>
          )}

          {/* Show info about tag propagation if enabled */}
          {inheritance.includes('tags') && subAssets.length > 0 && (
            <Text size="xs" c="dimmed">
              {tTags('tagPropagation.note')
                .replace('{{targetType}}', tTags('subAssets'))
                .replace('{{entityType}}', tTags('kit'))}
            </Text>
          )}
        </Stack>
      </Card>

      {isFixed && kit.boundAssets && kit.boundAssets.length > 0 && (
        <Card withBorder>
          <Stack gap="md">
            <Title order={4}>{t('detail.boundAssetsHeading')}</Title>
            <Divider />
            <Table striped highlightOnHover withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('detail.subAssets.columns.asset')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {kit.boundAssets.map((bound) => (
                  <Table.Tr key={bound.assetId}>
                    <Table.Td>
                      <Group gap="xs">
                        <Text fw={500}>{bound.name}</Text>
                        <Text size="xs" c="dimmed">
                          {bound.assetNumber}
                        </Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>
      )}

      {isFixed && (
        <Card withBorder>
          <Stack gap="md">
            <Title order={4}>{t('detail.subAssetsHeading')}</Title>
            <Divider />
            {subAssetsLoading ? (
              <Skeleton height={160} radius="md" />
            ) : subAssets.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t('detail.subAssets.empty')}
              </Text>
            ) : (
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('detail.subAssets.columns.asset')}</Table.Th>
                    <Table.Th>{t('detail.subAssets.columns.status')}</Table.Th>
                    <Table.Th>{t('detail.subAssets.columns.location')}</Table.Th>
                    <Table.Th>{t('detail.subAssets.columns.tags')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {subAssets.map((asset) => (
                    <Table.Tr key={asset.id}>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text fw={500}>{asset.name}</Text>
                          <Text size="xs" c="dimmed">
                            {asset.assetNumber}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <Badge color={ASSET_STATUS_KANBAN_COLORS[asset.status] ?? 'gray'} variant="light">
                            {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
                          </Badge>
                          <PropertyInheritanceIndicator assetId={asset.id} property="status" />
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <Text size="sm">{asset.location || '—'}</Text>
                          <PropertyInheritanceIndicator assetId={asset.id} property="location" />
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <Text size="sm">
                            {(asset.tagIds?.length ?? 0) + (asset.inheritedTagIds?.length ?? 0)}
                          </Text>
                          <PropertyInheritanceIndicator assetId={asset.id} property="tags" />
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Card>
      )}

      {!isFixed && kit.poolRequirements && kit.poolRequirements.length > 0 && (
        <Card withBorder>
          <Stack gap="md">
            <Title order={4}>{t('detail.poolRequirementsHeading')}</Title>
            <Divider />
            <Stack gap={6}>
                  {kit.poolRequirements.map((pool, index) => (
                    <Group key={`${pool.assetTypeId}-${index}`} justify="space-between">
                      <Text>{t('detail.poolRequirement', { quantity: pool.quantity, name: pool.assetTypeName })}</Text>
                      {pool.filters && <Text size="xs" c="dimmed">{t('detail.poolRequirementFilter')}</Text>}
                </Group>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
