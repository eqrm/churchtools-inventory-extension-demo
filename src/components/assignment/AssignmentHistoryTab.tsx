import { Avatar, Badge, Box, Group, Paper, Stack, Text, Timeline } from '@mantine/core';
import { IconUser, IconUserCheck, IconUserX } from '@tabler/icons-react';
import { formatDateTime, formatDistanceToNow } from '../../utils/formatters';
import type { AssignmentHistoryEntry } from '../../types/assignment';

interface AssignmentHistoryTabProps {
  /** Array of assignment history entries for this asset */
  history: AssignmentHistoryEntry[];
}

/**
 * AssignmentHistoryTab Component
 * 
 * Displays chronological timeline of asset assignments.
 * Shows who used the asset and when it was returned.
 * 
 * @example
 * ```tsx
 * <AssignmentHistoryTab
 *   history={assetAssignmentHistory}
 * />
 * ```
 */
export function AssignmentHistoryTab({ history }: AssignmentHistoryTabProps) {
  if (history.length === 0) {
    return (
      <Box p="md" style={{ textAlign: 'center' }}>
        <IconUser size={48} opacity={0.3} style={{ marginBottom: 16 }} />
        <Text c="dimmed" size="sm">
          No assignment history on record
        </Text>
      </Box>
    );
  }

  return (
    <Timeline active={-1} bulletSize={24} lineWidth={2}>
      {history.map((entry) => {
        const isReturned = entry.checkedInAt !== undefined && entry.checkedInAt !== null;
        const duration = isReturned && entry.checkedInAt
          ? calculateDuration(entry.assignedAt, entry.checkedInAt)
          : null;

        return (
          <Timeline.Item
            key={entry.id}
            bullet={isReturned ? <IconUserCheck size={12} /> : <IconUserX size={12} />}
            title={
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" fw={500}>
                  {isReturned ? 'Returned' : 'Assigned'}
                </Text>
                <Badge color={isReturned ? 'green' : 'blue'} size="sm">
                  {isReturned ? 'Completed' : 'Active'}
                </Badge>
              </Group>
            }
          >
            <Paper withBorder p="md" mt="xs">
              <Stack gap="sm">
                {/* Assignment Info */}
                <div>
                  <Text size="xs" c="dimmed" mb={8}>
                    Assigned to:
                  </Text>
                  <Group gap="sm">
                    <Avatar size="sm" radius="xl">
                      <IconUser size={16} />
                    </Avatar>
                    <div>
                      <Text size="sm" fw={500}>
                        {entry.target.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatDateTime(entry.assignedAt)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        by {entry.assignedByName || 'Unknown'}
                      </Text>
                    </div>
                  </Group>
                </div>

                {/* Check-in Info */}
                {isReturned && entry.checkedInAt && (
                  <div>
                    <Text size="xs" c="dimmed" mb={8}>
                      Checked in:
                    </Text>
                    <Group gap="sm">
                      <Avatar size="sm" radius="xl" color="green">
                        <IconUserCheck size={16} />
                      </Avatar>
                      <div>
                        <Text size="sm" fw={500}>
                          {formatDateTime(entry.checkedInAt)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          by {entry.checkedInByName || 'Unknown'}
                        </Text>
                        {duration && (
                          <Text size="xs" c="dimmed">
                            Duration: {duration}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </div>
                )}

                {/* Active Assignment */}
                {!isReturned && (
                  <Text size="xs" c="blue">
                    Currently in use (assigned {formatDistanceToNow(entry.assignedAt)})
                  </Text>
                )}
              </Stack>
            </Paper>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}

/**
 * Calculate duration between two timestamps in human-readable format
 */
function calculateDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min`;
  } else {
    const minutes = Math.floor(diffMs / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}
