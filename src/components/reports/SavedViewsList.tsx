/**
 * SavedViewsList Component (T194 - Refactored)
 * 
 * Display and manage saved views with inline loading/error states
 */

import { Stack, Card, Group, Text, Badge, ActionIcon, Menu, Loader } from '@mantine/core';
import { IconDots, IconEdit, IconTrash, IconEye, IconWorld, IconLock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { SavedView } from '../../types/entities';
import { useSavedViews, useDeleteSavedView } from '../../hooks/useSavedViews';

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
  return (
    <Card key={view.id} padding="sm" withBorder>
      <Group justify="space-between">
        <Stack gap={4} style={{ flex: 1 }}>
          <Group gap="xs">
            <Text fw={500}>{view.name}</Text>
            {view.isPublic ? (
              <Badge leftSection={<IconWorld size={12} />} variant="light" size="sm">
                Public
              </Badge>
            ) : (
              <Badge leftSection={<IconLock size={12} />} variant="light" size="sm" color="gray">
                Private
              </Badge>
            )}
            <Badge variant="light" size="sm" color="blue">
              {view.viewMode}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {view.filters.length} filters • Created by {view.ownerName}
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
                  Edit
                </Menu.Item>
              )}
              <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={onDelete}>
                Delete
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
  const { data: views, isLoading, error } = useSavedViews();
  const deleteMutation = useDeleteSavedView();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete view "${name}"?`)) return;

    try {
      await deleteMutation.mutateAsync(id);
      notifications.show({
        title: 'Success',
        message: 'View deleted',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Unable to delete view',
        color: 'red',
      });
    }
  };

  if (isLoading) {
    return (
      <Group justify="center" p="md">
        <Loader size="sm" />
        <Text c="dimmed" size="sm">Loading views…</Text>
      </Group>
    );
  }

  if (error) {
    return (
      <Text c="red" size="sm" p="md">
        Failed to load views
      </Text>
    );
  }

  if (!views || views.length === 0) {
    return (
      <Text c="dimmed" size="sm" p="md" ta="center">
        No saved views yet
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

