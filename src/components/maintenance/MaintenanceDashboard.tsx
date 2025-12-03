/**
 * MaintenanceDashboard component (T174)
 * Compact overview widget for maintenance status
 */

import { Box, Button, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconAlertTriangle, IconClock, IconCalendarCheck, IconPlus, IconList } from '@tabler/icons-react';
import { useOverdueMaintenance, useMaintenanceSchedules } from '../../hooks/useMaintenance';
import { daysUntilDue } from '../../utils/maintenanceCalculations';
import { Link, useNavigate } from 'react-router-dom';
import { routes } from '../../router/routes';

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: typeof IconAlertTriangle;
}

function StatCard({ label, value, color, icon: Icon }: StatCardProps) {
  return (
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon size="lg" radius="md" color={color} variant="light">
        <Icon size={18} />
      </ThemeIcon>
      <Box>
        <Text size="xl" fw={700} lh={1}>
          {value}
        </Text>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Box>
    </Group>
  );
}

export function MaintenanceDashboard() {
  const { t } = useTranslation('maintenance');
  const navigate = useNavigate();
  const { data: overdueSchedules, isLoading: overdueLoading } = useOverdueMaintenance();
  const { data: allSchedules, isLoading: schedulesLoading } = useMaintenanceSchedules();

  if (overdueLoading || schedulesLoading) {
    return <Text size="sm" c="dimmed">{t('dashboardPage.loading')}</Text>;
  }

  const upcoming = (allSchedules || []).filter(s => {
    const days = daysUntilDue(s);
    return days !== null && days > 0 && days <= 30;
  });

  return (
    <Box
      p="md"
      style={{
        background: 'var(--mantine-color-gray-0)',
        borderRadius: 8,
      }}
    >
      <Stack gap="md">
        {/* Stats Row */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xl">
            <StatCard
              label={t('dashboardPage.overdue')}
              value={overdueSchedules?.length || 0}
              color="red"
              icon={IconAlertTriangle}
            />
            <StatCard
              label={t('dashboardPage.upcoming')}
              value={upcoming.length}
              color="yellow"
              icon={IconClock}
            />
            <StatCard
              label={t('dashboardPage.scheduled')}
              value={allSchedules?.length || 0}
              color="blue"
              icon={IconCalendarCheck}
            />
          </Group>

          {/* Quick Actions */}
          <Group gap="xs">
            <Button
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate(routes.maintenance.workOrders.list())}
            >
              {t('dashboardPage.createWorkOrder')}
            </Button>
            <Button
              component={Link}
              to={routes.maintenance.rules.list()}
              variant="light"
              size="sm"
              leftSection={<IconList size={16} />}
            >
              {t('dashboardPage.viewAllRules')}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Box>
  );
}
