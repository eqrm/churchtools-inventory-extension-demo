/**
 * Recent Activity Timeline Widget Component (T172)
 * 
 * Shows recent actions across all assets.
 */

import { Paper, Title, Text, Stack, Group, Alert } from '@mantine/core';
import { IconTimeline, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function RecentActivityTimeline() {
  const { t } = useTranslation('dashboard');

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group gap="xs">
          <IconTimeline size={20} />
          <Title order={4}>{t('widgets.recentActivity.title')}</Title>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          {t('widgets.recentActivity.comingSoon')}
        </Alert>

        <Text size="sm" c="dimmed">
          {t('widgets.recentActivity.description')}
        </Text>
      </Stack>
    </Paper>
  );
}
