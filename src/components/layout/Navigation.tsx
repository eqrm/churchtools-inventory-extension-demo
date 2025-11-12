import { AppShell, Burger, Group, NavLink, Title, ActionIcon, Tooltip, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBox,
  IconCategory,
  IconClipboardList,
  IconHome,
  IconScan,
  IconSettings,
  IconCalendarEvent,
  IconPackage,
  IconChartBar,
  IconTool,
  IconUsersGroup,
  IconHistory,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';
import { useFeatureSettingsStore } from '../../stores';
import { UndoHistory } from '../undo/UndoHistory';
import { useUndoHistory } from '../../hooks/useUndo';
import { useTranslation } from 'react-i18next';

interface NavigationProps {
  children: ReactNode;
  onScanClick?: () => void;
}

export function Navigation({ children, onScanClick }: NavigationProps) {
  const { t } = useTranslation(['undo', 'common']);
  const [opened, { toggle, close }] = useDisclosure();
  const [undoHistoryOpened, { open: openUndoHistory, close: closeUndoHistory }] = useDisclosure(false);
  const location = useLocation();
  const { bookingsEnabled, kitsEnabled, maintenanceEnabled } = useFeatureSettingsStore((state) => ({
    bookingsEnabled: state.bookingsEnabled,
    kitsEnabled: state.kitsEnabled,
    maintenanceEnabled: state.maintenanceEnabled,
  }));
  const {
    history: undoHistory,
    undoAction,
    isLoading: isUndoHistoryLoading,
    isMutating: isUndoMutating,
    error: undoError,
    refetch: refetchUndoHistory,
  } = useUndoHistory();

  const routeIsActive = (path: string | undefined) => {
    if (!path) return false;
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (
    event: ReactMouseEvent<HTMLElement>,
    context: { label: string; route?: string },
  ) => {
    const { route } = context;
    if (routeIsActive(route)) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }

    close();
  };

  // Detect platform for correct keyboard shortcut display
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  const scanShortcut = isMac ? '⌘S' : 'Alt+S';

  useEffect(() => {
    if (undoHistoryOpened) {
      void refetchUndoHistory();
    }
  }, [undoHistoryOpened, refetchUndoHistory]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Title order={3}>Inventory Manager</Title>
          </Group>
          <Tooltip label={t('undo:openHistoryTooltip')}>
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={openUndoHistory}
              aria-label={t('undo:openHistoryAria')}
            >
              <IconHistory size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          data-nav-label="Dashboard"
          component={Link}
          to="/"
          label="Dashboard"
          leftSection={<IconHome size={20} />}
          active={routeIsActive('/')}
          onClick={(event) => handleNavClick(event, { label: 'Dashboard', route: '/' })}
        />
        
        <NavLink
          data-nav-label="Categories"
          component={Link}
          to="/categories"
          label="Categories"
          leftSection={<IconCategory size={20} />}
          active={routeIsActive('/categories')}
          onClick={(event) => handleNavClick(event, { label: 'Categories', route: '/categories' })}
        />
        
        <NavLink
          data-nav-label="Assets"
          component={Link}
          to="/assets"
          label="Assets"
          leftSection={<IconBox size={20} />}
          active={routeIsActive('/assets')}
          onClick={(event) => handleNavClick(event, { label: 'Assets', route: '/assets' })}
        />

        <NavLink
          data-nav-label="Asset Models"
          component={Link}
          to="/asset-groups"
          label="Asset Models"
          leftSection={<IconUsersGroup size={20} />}
          active={routeIsActive('/asset-groups')}
          onClick={(event) => handleNavClick(event, { label: 'Asset Models', route: '/asset-groups' })}
        />

        {bookingsEnabled && (
          <NavLink
            data-nav-label="Bookings"
            component={Link}
            to="/bookings"
            label="Bookings"
            leftSection={<IconCalendarEvent size={20} />}
            active={routeIsActive('/bookings')}
            onClick={(event) => handleNavClick(event, { label: 'Bookings', route: '/bookings' })}
          />
        )}

        {kitsEnabled && (
          <NavLink
            data-nav-label="Kits"
            component={Link}
            to="/kits"
            label="Kits"
            leftSection={<IconPackage size={20} />}
            active={routeIsActive('/kits')}
            onClick={(event) => handleNavClick(event, { label: 'Kits', route: '/kits' })}
          />
        )}

        <NavLink
          data-nav-label="Stock Take"
          component={Link}
          to="/stock-take"
          label="Stock Take"
          leftSection={<IconClipboardList size={20} />}
          active={routeIsActive('/stock-take')}
          onClick={(event) => handleNavClick(event, { label: 'Stock Take', route: '/stock-take' })}
        />

        <NavLink
          data-nav-label="Reports"
          component={Link}
          to="/reports"
          label="Reports"
          leftSection={<IconChartBar size={20} />}
          active={routeIsActive('/reports')}
          onClick={(event) => handleNavClick(event, { label: 'Reports', route: '/reports' })}
        />

        {maintenanceEnabled && (
          <NavLink
            data-nav-label="Maintenance"
            component={Link}
            to="/maintenance"
            label="Maintenance"
            leftSection={<IconTool size={20} />}
            active={routeIsActive('/maintenance')}
            onClick={(event) => handleNavClick(event, { label: 'Maintenance', route: '/maintenance' })}
          />
        )}

        <NavLink
          data-nav-label="Quick Scan"
          label="Quick Scan"
          description={scanShortcut}
          leftSection={<IconScan size={20} />}
          onClick={(event) => {
            event.preventDefault();
            close();
            onScanClick?.();
          }}
        />
        
        <NavLink
          data-nav-label="Settings"
          component={Link}
          to="/settings"
          label="Settings"
          leftSection={<IconSettings size={20} />}
          active={routeIsActive('/settings')}
          onClick={(event) => handleNavClick(event, { label: 'Settings', route: '/settings' })}
        />
      </AppShell.Navbar>

      <AppShell.Main data-view-key={location.pathname}>
        {children}
      </AppShell.Main>

      <Modal
        opened={undoHistoryOpened}
        onClose={closeUndoHistory}
        title={t('undo:modalTitle')}
        size="lg"
      >
        {undoError && (
          <Text c="red" size="sm" mb="sm">
            {undoError}
          </Text>
        )}
        <UndoHistory
          actions={undoHistory}
          onUndo={async (actionId: string) => {
            await undoAction(actionId);
          }}
          loading={isUndoHistoryLoading || isUndoMutating}
        />
      </Modal>
    </AppShell>
  );
}
