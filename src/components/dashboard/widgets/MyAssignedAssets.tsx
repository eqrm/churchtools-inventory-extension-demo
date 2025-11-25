/**
 * My Assigned Assets Widget Component (T169)
 * 
 * Shows assets currently assigned to the logged-in user.
 */

import { Paper, Title, Text, Stack, Badge, Group, Alert } from '@mantine/core';
import { IconUser, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function MyAssignedAssets() {
  const { t } = useTranslation('dashboard');

  // TODO: Implement when global assignments list is available
  // Requires: useAllAssignments() hook with current user filter

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <IconUser size={20} />
            <Title order={4}>{t('widgets.myAssignedAssets.title')}</Title>
          </Group>
          <Badge color="blue" size="lg" circle>
            0
          </Badge>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          {t('widgets.myAssignedAssets.comingSoon')}
        </Alert>

        <Text size="sm" c="dimmed">
          {t('widgets.myAssignedAssets.description')}
        </Text>
      </Stack>
    </Paper>
  );
}
