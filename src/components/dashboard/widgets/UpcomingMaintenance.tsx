/**
 * Upcoming Maintenance Widget Component (T171)
 * 
 * Shows maintenance due in next 30 days.
 */

import { Paper, Title, Text, Stack, Badge, Group, Alert } from '@mantine/core';
import { IconCalendarEvent, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function UpcomingMaintenance() {
  const { t } = useTranslation('dashboard');

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <IconCalendarEvent size={20} />
            <Title order={4}>{t('widgets.upcomingMaintenance.title')}</Title>
          </Group>
          <Badge color="cyan" size="lg" circle>
            0
          </Badge>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          {t('widgets.upcomingMaintenance.comingSoon')}
        </Alert>

        <Text size="sm" c="dimmed">
          {t('widgets.upcomingMaintenance.description')}
        </Text>
      </Stack>
    </Paper>
  );
}
