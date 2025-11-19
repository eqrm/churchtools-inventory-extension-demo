/**
 * SavedViewsList Component (T194 - Refactored)
 * 
 * Display and manage saved views with inline loading/error states
 */

import { Stack, Card, Group, Text, Badge, ActionIcon, Menu, Loader } from '@mantine/core';
import { IconDots, IconEdit, IconTrash, IconEye, IconWorld, IconLock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import type { SavedView } from '../../types/entities';
import { useSavedViews, useDeleteSavedView } from '../../hooks/useSavedViews';
import { ErrorState } from '../common/ErrorState';
import { countFilterConditions } from '../../utils/viewFilters';

interface SavedViewsListProps {
  onSelectView: (view: SavedView) => void;
  onEditView?: (view: SavedView) => void;
}

/**
 * Individual saved view card
 */
function ViewCard({
  view,
  onSelect,
  onEdit,
  onDelete,
}: {
  view: SavedView;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('views');
  const modeLabel = t(`modes.${view.viewMode}`, view.viewMode);
  return (
    <Card key={view.id} padding="sm" withBorder>
      <Group justify="space-between">
        <Stack gap={4} style={{ flex: 1 }}>
          <Group gap="xs">
            <Text fw={500}>{view.name}</Text>
            {view.isPublic ? (
              <Badge leftSection={<IconWorld size={12} />} variant="light" size="sm">
                {t('drawer.publicLabel')}
              </Badge>
            ) : (
              <Badge leftSection={<IconLock size={12} />} variant="light" size="sm" color="gray">
                {t('drawer.privateLabel')}
              </Badge>
            )}
            <Badge variant="light" size="sm" color="blue">
              {modeLabel}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {t('drawer.filtersCount', { count: countFilterConditions(view.filters) })} • {t('drawer.owner', { name: view.ownerName })}
          </Text>
        </Stack>

        <Group gap="xs">
          <ActionIcon variant="light" color="blue" onClick={onSelect}>
            <IconEye size={16} />
          </ActionIcon>

          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" onClick={(e) => e.stopPropagation()}>
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {onEdit && (
                <Menu.Item leftSection={<IconEdit size={14} />} onClick={onEdit}>
                  {t('header.renameSavedView')}
                </Menu.Item>
              )}
              <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={onDelete}>
                {t('header.deleteSavedView')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Card>
  );
}

/**
 * Display list of user's saved views
 */
export function SavedViewsList({ onSelectView, onEditView }: SavedViewsListProps) {
  const { t } = useTranslation('views');
  const { data: views, isLoading, error, refetch } = useSavedViews();
  const deleteMutation = useDeleteSavedView();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('drawer.deleteConfirm', { name }))) return;

    try {
      await deleteMutation.mutateAsync(id);
      notifications.show({
        title: t('notifications.deleteSuccessTitle'),
        message: t('notifications.deleteSuccessMessage'),
        color: 'green',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      notifications.show({
        title: t('notifications.deleteErrorTitle'),
        message: t('notifications.deleteErrorMessage', { message }),
        color: 'red',
      });
    }
  };

  if (isLoading) {
    return (
      <Group justify="center" p="md">
        <Loader size="sm" />
        <Text c="dimmed" size="sm">{t('drawer.loading')}</Text>
      </Group>
    );
  }

  if (error) {
    return <ErrorState message={t('drawer.error')} onRetry={() => { void refetch(); }} />;
  }

  if (!views || views.length === 0) {
    return (
      <Text c="dimmed" size="sm" p="md" ta="center">
        {t('drawer.empty')}
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {views.map((view) => (
        <ViewCard
          key={view.id}
          view={view}
          onSelect={() => onSelectView(view)}
          onEdit={onEditView ? () => onEditView(view) : undefined}
          onDelete={() => handleDelete(view.id, view.name)}
        />
      ))}
    </Stack>
  );
}

