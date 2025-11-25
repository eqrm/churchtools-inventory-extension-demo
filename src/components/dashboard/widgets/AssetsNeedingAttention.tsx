/**
 * Assets Needing Attention Widget Component (T170)
 * 
 * Shows broken assets or those requiring maintenance.
 */

import { Paper, Title, Text, Stack, Badge, Group, Alert } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function AssetsNeedingAttention() {
  const { t } = useTranslation('dashboard');

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <IconAlertTriangle size={20} />
            <Title order={4}>{t('widgets.assetsNeedingAttention.title')}</Title>
          </Group>
          <Badge color="orange" size="lg" circle>
            0
          </Badge>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          {t('widgets.assetsNeedingAttention.comingSoon')}
        </Alert>

        <Text size="sm" c="dimmed">
          {t('widgets.assetsNeedingAttention.description')}
        </Text>
      </Stack>
    </Paper>
  );
}
