import { useMemo } from 'react';
import { Outlet, useMatch, Link } from 'react-router-dom';
import { Card, Container, Stack, Title, Text, SimpleGrid, Button, Group } from '@mantine/core';
import { IconCalendarCheck, IconClipboardList, IconGauge, IconTool, IconArrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MaintenanceDashboard } from '../components/maintenance/MaintenanceDashboard';
import { routes } from '../router/routes';

interface QuickLinkDefinition {
  key: 'overview' | 'companies' | 'rules' | 'workOrders';
  label: string;
  description: string;
  icon: typeof IconGauge;
  destination: string;
}

/**
 * Maintenance Page - Central hub for maintenance management
 * Provides:
 * - Upcoming maintenance schedules
 * - Overdue maintenance alerts
 * - Maintenance compliance tracking
 * - Quick access to maintenance records
 */
export function MaintenancePage() {
  const { t } = useTranslation('maintenance');
  const matchRoot = useMatch({ path: routes.maintenance.root(), end: true });
  const isRootRoute = Boolean(matchRoot);
  const quickLinks = useMemo<QuickLinkDefinition[]>(
    () => [
      {
        key: 'overview',
        label: t('page.links.dashboard'),
        description: t('page.sections.dashboard'),
        icon: IconGauge,
        destination: routes.maintenance.dashboard(),
      },
      {
        key: 'companies',
        label: t('page.links.companies'),
        description: t('page.sections.companies'),
        icon: IconTool,
        destination: routes.maintenance.companies(),
      },
      {
        key: 'rules',
        label: t('page.links.rules'),
        description: t('page.sections.rules'),
        icon: IconClipboardList,
        destination: routes.maintenance.rules.list(),
      },
      {
        key: 'workOrders',
        label: t('page.links.workOrders'),
        description: t('page.sections.workOrders'),
        icon: IconCalendarCheck,
        destination: routes.maintenance.workOrders.list(),
      },
    ],
    [t],
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap="sm">
          <Title order={1}>{t('page.title')}</Title>
          <Text size="lg" c="dimmed">
            {t('page.description')}
          </Text>
        </Stack>

        {isRootRoute ? (
          <Stack gap="xl">
            <Card withBorder radius="md" data-testid="maintenance-overview-card">
              <Stack gap="lg">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Title order={3}>{t('page.overviewCard.title')}</Title>
                    <Text size="sm" c="dimmed">
                      {t('page.overviewCard.description')}
                    </Text>
                  </Stack>
                  <Button
                    component={Link}
                    to={routes.maintenance.dashboard()}
                    variant="light"
                    leftSection={<IconGauge size={16} />}
                  >
                    {t('page.links.dashboard')}
                  </Button>
                </Group>
                <MaintenanceDashboard />
              </Stack>
            </Card>

            <Stack gap="sm">
              <Title order={3}>{t('page.quickLinks.title')}</Title>
              <Text size="sm" c="dimmed">
                {t('page.quickLinks.description')}
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                {quickLinks.map(({ key, label, description, icon: Icon, destination }) => (
                  <Card key={key} withBorder radius="md" data-testid={`maintenance-quick-link-${key}`}>
                    <Stack gap="sm">
                      <Icon size={28} stroke={1.8} />
                      <Stack gap={2}>
                        <Text fw={600}>{label}</Text>
                        <Text size="sm" c="dimmed">
                          {description}
                        </Text>
                      </Stack>
                      <Button
                        component={Link}
                        to={destination}
                        variant="light"
                        rightSection={<IconArrowRight size={16} />}
                      >
                        {t('page.quickLinks.openLabel', { label })}
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          </Stack>
        ) : (
          <Outlet />
        )}
      </Stack>
    </Container>
  );
}
