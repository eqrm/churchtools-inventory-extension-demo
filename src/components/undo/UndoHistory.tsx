import { Box, Button, Group, ScrollArea, Stack, Text, Timeline } from '@mantine/core';
import { IconHistory, IconRefresh } from '@tabler/icons-react';
import { formatDistanceToNow } from '../../utils/formatters';
import type { UndoAction } from '../../types/undo';
import { useTranslation } from 'react-i18next';

interface UndoHistoryProps {
  /** Array of undo actions to display */
  actions: UndoAction[];
  /** Callback when user clicks undo button */
  onUndo: (actionId: string) => void;
  /** Whether undo operation is in progress */
  loading?: boolean;
  /** Currently undoing action id for per-row loader */
  undoingActionId?: string;
}

/**
 * UndoHistory Component
 * 
 * Displays a timeline of recent user actions with undo capability.
 * Shows up to 50 actions within the last 24 hours.
 * 
 * @example
 * ```tsx
 * <UndoHistory
 *   actions={undoActions}
 *   onUndo={handleUndo}
 *   loading={isUndoing}
 * />
 * ```
 */
export function UndoHistory({ actions, onUndo, loading = false, undoingActionId }: UndoHistoryProps) {
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
      <Timeline active={-1} bulletSize={24} lineWidth={2}>
        {actions.map((action) => {
          const isExpired = action.expiresAt && new Date(action.expiresAt) < new Date();
          const isUndone = action.undoStatus === 'reverted';
          const canUndo = !isExpired && !isUndone;
          const isActionLoading = undoingActionId ? undoingActionId === action.actionId : false;
          const isDisabled = loading || isActionLoading;

          // Build action description
          const description = t('actionLabel', {
            actionType: action.actionType,
            entityType: action.entityType,
          });

          return (
            <Timeline.Item
              key={action.actionId}
              bullet={<IconRefresh size={12} />}
              title={
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={500}>
                    {description}
                  </Text>
                  {canUndo && (
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => onUndo(action.actionId)}
                      loading={isActionLoading}
                      disabled={isDisabled}
                    >
                      {t('actions.undo')}
                    </Button>
                  )}
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
