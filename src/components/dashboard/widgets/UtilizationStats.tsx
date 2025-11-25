/**
 * Utilization Stats Widget Component (T173)
 * 
 * Shows asset utilization percentages.
 */

import { Paper, Title, Text, Stack, Group, Alert } from '@mantine/core';
import { IconChartBar, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function UtilizationStats() {
  const { t } = useTranslation('dashboard');

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group gap="xs">
          <IconChartBar size={20} />
          <Title order={4}>{t('widgets.utilizationStats.title')}</Title>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          {t('widgets.utilizationStats.comingSoon')}
        </Alert>

        <Text size="sm" c="dimmed">
          {t('widgets.utilizationStats.description')}
        </Text>
      </Stack>
    </Paper>
  );
}
