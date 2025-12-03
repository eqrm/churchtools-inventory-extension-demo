import { useMemo } from 'react';
import { Outlet, useMatch, Link } from 'react-router-dom';
import { Box, Container, Group, UnstyledButton, Text, ThemeIcon, Stack } from '@mantine/core';
import {
  IconGauge,
  IconTool,
  IconClipboardList,
  IconCalendarCheck,
  IconChevronRight,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MaintenanceDashboard } from '../components/maintenance/MaintenanceDashboard';
import { routes } from '../router/routes';

interface NavItemProps {
  icon: typeof IconGauge;
  label: string;
  description: string;
  to: string;
  color: string;
}

function NavItem({ icon: Icon, label, description, to, color }: NavItemProps) {
  return (
    <UnstyledButton
      component={Link}
      to={to}
      p="md"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderRadius: 8,
        border: '1px solid var(--mantine-color-gray-2)',
        background: 'white',
        width: '100%',
        transition: 'all 0.15s ease',
      }}
    >
      <ThemeIcon size={40} radius="md" color={color} variant="light">
        <Icon size={22} />
      </ThemeIcon>
      <Box style={{ flex: 1 }}>
        <Text fw={600} size="sm">
          {label}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {description}
        </Text>
      </Box>
      <IconChevronRight size={18} color="var(--mantine-color-gray-5)" />
    </UnstyledButton>
  );
}

export function MaintenancePage() {
  const { t } = useTranslation('maintenance');
  const matchRoot = useMatch({ path: routes.maintenance.root(), end: true });
  const isRootRoute = Boolean(matchRoot);

  const navItems = useMemo<NavItemProps[]>(
    () => [
      {
        icon: IconGauge,
        label: t('page.links.dashboard'),
        description: t('page.sections.dashboard'),
        to: routes.maintenance.dashboard(),
        color: 'blue',
      },
      {
        icon: IconTool,
        label: t('page.links.companies'),
        description: t('page.sections.companies'),
        to: routes.maintenance.companies(),
        color: 'grape',
      },
      {
        icon: IconClipboardList,
        label: t('page.links.rules'),
        description: t('page.sections.rules'),
        to: routes.maintenance.rules.list(),
        color: 'orange',
      },
      {
        icon: IconCalendarCheck,
        label: t('page.links.workOrders'),
        description: t('page.sections.workOrders'),
        to: routes.maintenance.workOrders.list(),
        color: 'teal',
      },
    ],
    [t],
  );

  if (!isRootRoute) {
    return <Outlet />;
  }

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        {/* Compact Dashboard Widget */}
        <MaintenanceDashboard />

        {/* Navigation Grid */}
        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm">
            {t('page.quickLinks.title')}
          </Text>
          <Group gap="sm" grow>
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </Group>
        </Box>
      </Stack>
    </Container>
  );
}
