/**
 * Overdue Work Orders Widget Component (T174)
 * 
 * Shows work orders past their scheduled end date.
 */

import { Paper, Title, Text, Stack, Badge, Group, Alert } from '@mantine/core';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function OverdueWorkOrders() {
  const { t } = useTranslation('dashboard');

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <IconAlertCircle size={20} />
            <Title order={4}>{t('widgets.overdueWorkOrders.title')}</Title>
          </Group>
          <Badge color="red" size="lg" circle>
            0
          </Badge>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          {t('widgets.overdueWorkOrders.comingSoon')}
        </Alert>

        <Text size="sm" c="dimmed">
          {t('widgets.overdueWorkOrders.description')}
        </Text>
      </Stack>
    </Paper>
  );
}
