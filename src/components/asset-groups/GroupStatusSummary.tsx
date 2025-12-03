import { Card, Group, Progress, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconClock, IconMapPin } from '@tabler/icons-react';
import type { Asset } from '../../types/entities';

interface GroupStatusSummaryProps {
  members: Asset[];
}

interface GroupStats {
  total: number;
  available: number;
  inUse: number;
  issue: number;
  installed: number;
  topLocations: [string, number][];
}

function calculateGroupStats(members: Asset[]): GroupStats {
  const total = members.length;
  const available = members.filter((asset) => asset.status === 'available').length;
  const inUse = members.filter((asset) => asset.status === 'in-use').length;
  const issue = members.filter((asset) => asset.status === 'broken' || asset.status === 'in-repair').length;
  const installed = members.filter((asset) => asset.status === 'installed').length;
  const locationTotals = members.reduce<Record<string, number>>((acc, asset) => {
    const key = asset.location || 'Unspecified';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const topLocations = Object.entries(locationTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return {
    total,
    available,
    inUse,
    issue,
    installed,
    topLocations,
  };
}

export function GroupStatusSummary({ members }: GroupStatusSummaryProps) {
  if (members.length === 0) {
    return null;
  }

  const stats = calculateGroupStats(members);
  const availablePercent = stats.total === 0 ? 0 : (stats.available / stats.total) * 100;
  const inUsePercent = stats.total === 0 ? 0 : (stats.inUse / stats.total) * 100;
  const issuePercent = stats.total === 0 ? 0 : (stats.issue / stats.total) * 100;

  return (
    <Card withBorder p="sm">
      <Stack gap="xs">
        {/* Progress Bar */}
        <Group justify="space-between" gap="xs">
          <Text size="xs" fw={500}>Status</Text>
          <Text size="xs" c="dimmed">{stats.available}/{stats.total} available</Text>
        </Group>
        <Progress.Root size="lg">
          <Tooltip label={`${stats.available} Available`}>
            <Progress.Section value={availablePercent} color="green" />
          </Tooltip>
          <Tooltip label={`${stats.inUse} In Use`}>
            <Progress.Section value={inUsePercent} color="blue" />
          </Tooltip>
          {stats.issue > 0 && (
            <Tooltip label={`${stats.issue} Needs Attention`}>
              <Progress.Section value={issuePercent} color="red" />
            </Tooltip>
          )}
        </Progress.Root>

        {/* Legend - Compact */}
        <Group gap="md">
          <Group gap={4}>
            <IconCheck size={12} color="var(--mantine-color-green-6)" />
            <Text size="xs">{stats.available} Available</Text>
          </Group>
          <Group gap={4}>
            <IconClock size={12} color="var(--mantine-color-blue-6)" />
            <Text size="xs">{stats.inUse} In Use</Text>
          </Group>
          {stats.issue > 0 && (
            <Group gap={4}>
              <IconAlertCircle size={12} color="var(--mantine-color-red-6)" />
              <Text size="xs">{stats.issue} Issue</Text>
            </Group>
          )}
          {stats.installed > 0 && (
            <Text size="xs" c="dimmed">{stats.installed} Installed</Text>
          )}
        </Group>

        {/* Top Locations - Inline */}
        {stats.topLocations.length > 0 && (
          <Group gap="xs">
            <IconMapPin size={12} style={{ color: 'var(--mantine-color-dimmed)' }} />
            {stats.topLocations.map(([location, count], index) => (
              <Text key={location} size="xs" c="dimmed">
                {location} ({count}){index < stats.topLocations.length - 1 ? ',' : ''}
              </Text>
            ))}
          </Group>
        )}
      </Stack>
    </Card>
  );
}
