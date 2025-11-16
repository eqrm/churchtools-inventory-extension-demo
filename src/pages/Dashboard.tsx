/**
 * Dashboard Page Component (T167)
 * 
 * Main dashboard with key metrics and alerts.
 */

import { Container, Title, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DashboardGrid } from '../components/dashboard/DashboardGrid';

export function Dashboard() {
  const { t } = useTranslation('dashboard');

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Title order={1}>{t('title')}</Title>
        <DashboardGrid />
      </Stack>
    </Container>
  );
}
