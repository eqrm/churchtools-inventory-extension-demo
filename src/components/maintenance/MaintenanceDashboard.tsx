/**
 * MaintenanceDashboard component (T174)
 * Overview of overdue and upcoming maintenance
 */

import { Alert, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconClock, IconTool } from '@tabler/icons-react';
import { useOverdueMaintenance, useMaintenanceSchedules } from '../../hooks/useMaintenance';
import { daysUntilDue } from '../../utils/maintenanceCalculations';
import { MaintenanceReminderBadge } from './MaintenanceReminderBadge';
import { Link } from 'react-router-dom';

/**
 * Dashboard showing maintenance status
 */
export function MaintenanceDashboard() {
  const { data: overdueSchedules, isLoading: overdueLoading } = useOverdueMaintenance();
  const { data: allSchedules, isLoading: schedulesLoading } = useMaintenanceSchedules();

  if (overdueLoading || schedulesLoading) {
    return <Text c="dimmed">Loading maintenance data...</Text>;
  }

  const upcoming = (allSchedules || []).filter(s => {
    const days = daysUntilDue(s);
    return days !== null && days > 0 && days <= 30;
  });

  return (
    <Stack gap="lg">
      <Title order={2}><Group gap="xs"><IconTool />Maintenance overview</Group></Title>

      {overdueSchedules && overdueSchedules.length > 0 && (
        <Alert color="red" icon={<IconAlertTriangle />} title="Overdue maintenance">
          <Stack gap="xs">
            {overdueSchedules.map(schedule => (
              <Group key={schedule.id} justify="space-between">
                <Link to={`/assets/${schedule.assetId}`} style={{ textDecoration: 'none' }}>
                  <Text fw={500}>Asset {schedule.assetId}</Text>
                </Link>
                <MaintenanceReminderBadge schedule={schedule} />
              </Group>
            ))}
          </Stack>
        </Alert>
      )}

      {upcoming.length > 0 && (
        <Card>
          <Stack gap="sm">
            <Group gap="xs"><IconClock /><Text fw={600}>Upcoming (30 days)</Text></Group>
            {upcoming.map(schedule => (
              <Group key={schedule.id} justify="space-between">
                <Text size="sm">Asset {schedule.assetId}</Text>
                <MaintenanceReminderBadge schedule={schedule} />
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      <Card>
        <Group gap="xl">
          <div>
            <Text size="xs" c="dimmed">Overdue</Text>
            <Text size="xl" fw={700} c="red">{overdueSchedules?.length || 0}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Upcoming</Text>
            <Text size="xl" fw={700} c="yellow">{upcoming.length}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Scheduled</Text>
            <Text size="xl" fw={700}>{allSchedules?.length || 0}</Text>
          </div>
        </Group>
      </Card>
    </Stack>
  );
}
