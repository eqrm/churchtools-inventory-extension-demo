import { Badge, Box, Group, ScrollArea, Stack, Text, Timeline } from '@mantine/core';
import { IconHistory, IconRefresh } from '@tabler/icons-react';
import { formatDistanceToNow } from '../../utils/formatters';
import type { UndoAction } from '../../types/undo';
import { useTranslation } from 'react-i18next';
import { MAX_UNDO_HISTORY } from '../../constants/undo';

interface UndoHistoryProps {
  /** Array of undo actions to display */
  actions: UndoAction[];
  /** Shortcut hint to surface inline */
  shortcutHint?: string;
  /** Maximum entries displayed */
  maxEntries?: number;
}

/**
 * UndoHistory Component
 * 
 * Displays a read-only timeline of recent user actions for traceability.
 * Shows up to 20 actions within the last 24 hours.
 * 
 * @example
 * ```tsx
 * <UndoHistory
 *   actions={undoActions}
 * />
 * ```
 */
export function UndoHistory({ actions, shortcutHint, maxEntries = MAX_UNDO_HISTORY }: UndoHistoryProps) {
  const { t } = useTranslation('undo');

  if (actions.length === 0) {
    return (
      <Box p="md" style={{ textAlign: 'center' }}>
        <IconHistory size={48} opacity={0.3} style={{ marginBottom: 16 }} />
        <Text c="dimmed" size="sm">
          {t('emptyState.title')}
        </Text>
      </Box>
    );
  }

  return (
    <ScrollArea h={400}>
      <Text size="sm" c="dimmed" mb="sm">
        {t('readOnlyHint', {
          limit: maxEntries,
          shortcut: shortcutHint ?? t('shortcuts.generic'),
        })}
      </Text>
      <Timeline active={-1} bulletSize={24} lineWidth={2}>
        {actions.map((action) => {
          const isExpired = action.expiresAt && new Date(action.expiresAt) < new Date();
          const isUndone = action.undoStatus === 'reverted';
          const isPending = !isExpired && !isUndone;

          // Build action description
          const description = t('actionLabel', {
            actionType: action.actionType,
            entityType: action.entityType,
          });

          let badgeColor: 'blue' | 'teal' | 'gray' | 'red' = 'blue';
          let badgeLabel = t('labels.pending');

          if (isUndone) {
            badgeColor = 'teal';
            badgeLabel = t('labels.undone');
          } else if (isExpired) {
            badgeColor = 'gray';
            badgeLabel = t('labels.expired');
          } else if (isPending && shortcutHint) {
            badgeColor = 'blue';
            badgeLabel = t('labels.available', { shortcut: shortcutHint });
          }

          return (
            <Timeline.Item
              key={action.actionId}
              bullet={<IconRefresh size={12} />}
              title={
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={500}>
                    {description}
                  </Text>
                  <Badge size="xs" color={badgeColor} variant="light">
                    {badgeLabel}
                  </Badge>
                </Group>
              }
            >
              <Stack gap="xs">
                <Text size="xs" c="dimmed">
                  {formatDistanceToNow(action.createdAt)}
                </Text>
                
                {action.entityType && (
                  <Text size="xs" c="dimmed">
                    {action.entityType} • {action.actionType}
                  </Text>
                )}

                {isUndone && (
                  <Text size="xs" c="green">
                    {t('labels.undone')}
                  </Text>
                )}

                {isExpired && !isUndone && (
                  <Text size="xs" c="red">
                    {t('labels.expired')}
                  </Text>
                )}
              </Stack>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </ScrollArea>
  );
}
