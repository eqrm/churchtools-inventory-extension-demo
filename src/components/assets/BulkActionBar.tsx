import { Group, Text, Button, Paper, ActionIcon, Tooltip } from '@mantine/core';
import { IconX, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions?: BulkAction[];
  totalCount?: number;
}

/**
 * BulkActionBar - A sticky bottom bar that appears when items are selected.
 * Provides bulk actions like status change, location change, tag operations, and delete.
 */
export function BulkActionBar({
  selectedCount,
  onClearSelection,
  actions = [],
  totalCount,
}: BulkActionBarProps) {
  const { t } = useTranslation('assets');

  if (selectedCount === 0) {
    return null;
  }

  const selectionText = totalCount
    ? t('bulkActions.selectedOfTotal', { count: selectedCount, total: totalCount })
    : t('bulkActions.selected', { count: selectedCount });

  return (
    <Paper
      shadow="md"
      p="sm"
      withBorder
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'var(--mantine-color-blue-6)',
        borderColor: 'var(--mantine-color-blue-7)',
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <IconCheck size={18} style={{ color: 'white' }} />
            <Text c="white" fw={500} size="sm">
              {selectionText}
            </Text>
          </Group>
          
          <Tooltip label={t('bulkActions.clearSelection')}>
            <ActionIcon
              variant="subtle"
              color="white"
              size="sm"
              onClick={onClearSelection}
              aria-label={t('bulkActions.clearSelection')}
            >
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group gap="xs" wrap="nowrap">
          {actions.map((action) => (
            <Tooltip key={action.id} label={action.label}>
              <Button
                variant="white"
                size="xs"
                leftSection={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
                color={action.color}
              >
                {action.label}
              </Button>
            </Tooltip>
          ))}
        </Group>
      </Group>
    </Paper>
  );
}
