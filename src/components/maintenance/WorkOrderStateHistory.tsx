/**
 * Work Order State History Component (T161)
 * 
 * Timeline visualization of work order state changes.
 */

import { Timeline, Text, Badge, Group, Box, Paper } from '@mantine/core';
import {
  IconCircle,
  IconCircleCheck,
  IconCircleX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { WorkOrderHistoryEntry, WorkOrderState } from '../../types/maintenance';

interface WorkOrderStateHistoryProps {
  history: WorkOrderHistoryEntry[];
}

export function WorkOrderStateHistory({ history }: WorkOrderStateHistoryProps) {
  const { t } = useTranslation(['maintenance', 'common']);

  const getStateColor = (state: WorkOrderState): string => {
    const colorMap: Record<WorkOrderState, string> = {
      backlog: 'gray',
      assigned: 'blue',
      planned: 'cyan',
      'offer-requested': 'yellow',
      'offer-received': 'orange',
      'in-progress': 'violet',
      completed: 'teal',
      done: 'green',
      aborted: 'red',
      obsolete: 'dark',
    };
    return colorMap[state] || 'gray';
  };

  const getStateIcon = (state: WorkOrderState) => {
    if (state === 'done') return IconCircleCheck;
    if (state === 'aborted' || state === 'obsolete') return IconCircleX;
    if (state === 'completed' || state === 'offer-received') return IconAlertCircle;
    return IconCircle;
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (currentEntry: WorkOrderHistoryEntry, nextEntry?: WorkOrderHistoryEntry) => {
    const start = new Date(currentEntry.changedAt);
    const end = nextEntry ? new Date(nextEntry.changedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return t('maintenance:duration.days', { count: days });
    }
    if (hours > 0) {
      return t('maintenance:duration.hours', { count: hours });
    }
    return t('maintenance:duration.lessThanHour');
  };

  // Sort history by timestamp descending (most recent first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  if (history.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text size="sm" c="dimmed" ta="center">
          {t('maintenance:noHistory')}
        </Text>
      </Paper>
    );
  }

  return (
    <Timeline active={sortedHistory.length} bulletSize={24} lineWidth={2}>
      {sortedHistory.map((entry, index) => {
        const Icon = getStateIcon(entry.state);
        const color = getStateColor(entry.state);
        const nextEntry = sortedHistory[index + 1];
        const duration = calculateDuration(entry, nextEntry);

        return (
          <Timeline.Item
            key={entry.id}
            bullet={<Icon size={12} />}
            title={
              <Group gap="xs">
                <Badge color={color} variant="light">
                  {t(`maintenance:states.${entry.state}`)}
                </Badge>
                {index === 0 && (
                  <Badge color="blue" variant="outline">
                    {t('maintenance:current')}
                  </Badge>
                )}
              </Group>
            }
            color={color}
          >
            <Box>
              <Text size="sm" c="dimmed">
                {formatDateTime(entry.changedAt)}
              </Text>
              {entry.changedByName && (
                <Text size="sm" c="dimmed">
                  {t('maintenance:changedBy')}: {entry.changedByName}
                </Text>
              )}
              {nextEntry && (
                <Text size="xs" c="dimmed" mt={4}>
                  {t('maintenance:duration.label')}: {duration}
                </Text>
              )}
              {entry.notes && (
                <Text size="sm" mt={4}>
                  {entry.notes}
                </Text>
              )}
            </Box>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
