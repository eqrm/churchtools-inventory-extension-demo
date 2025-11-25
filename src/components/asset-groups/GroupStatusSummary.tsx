import { Card, Group, Progress, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconClock } from '@tabler/icons-react';
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
    <Card withBorder>
      <Stack gap="md">
        <Title order={5}>Group Status</Title>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>Availability</Text>
            <Text size="sm" c="dimmed">{stats.available} of {stats.total} available</Text>
          </Group>
          <Progress.Root size="xl">
            <Progress.Section value={availablePercent} color="green">
              <Progress.Label>{stats.available}</Progress.Label>
            </Progress.Section>
            <Progress.Section value={inUsePercent} color="blue">
              <Progress.Label>{stats.inUse}</Progress.Label>
            </Progress.Section>
            <Progress.Section value={issuePercent} color="red">
              <Progress.Label>{stats.issue}</Progress.Label>
            </Progress.Section>
          </Progress.Root>
        </Stack>

        <Group gap="xl">
          <Group gap="xs">
            <IconCheck size={16} color="var(--mantine-color-green-6)" />
            <Text size="sm">{stats.available} Available</Text>
          </Group>
          <Group gap="xs">
            <IconClock size={16} color="var(--mantine-color-blue-6)" />
            <Text size="sm">{stats.inUse} In Use</Text>
          </Group>
          {stats.issue > 0 && (
            <Group gap="xs">
              <IconAlertCircle size={16} color="var(--mantine-color-red-6)" />
              <Text size="sm">{stats.issue} Needs Attention</Text>
            </Group>
          )}
          {stats.installed > 0 && (
            <Text size="sm" c="dimmed">{stats.installed} Installed</Text>
          )}
        </Group>

        {stats.topLocations.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>Top Locations</Text>
            {stats.topLocations.map(([location, count]) => (
              <Group key={location} justify="space-between">
                <Text size="sm">{location}</Text>
                <Text size="sm" c="dimmed">{count} units</Text>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
