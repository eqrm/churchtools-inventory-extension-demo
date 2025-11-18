import { AppShell, Burger, Group, NavLink, Title, ActionIcon, Tooltip, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBox,
  IconBoxMultiple,
  IconCategory,
  IconClipboardList,
  IconHome,
  IconScan,
  IconSettings,
  IconCalendarEvent,
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
  const { t: tNav } = useTranslation('navigation');
  const { t: tUndo } = useTranslation('undo');
  const [opened, { toggle, close }] = useDisclosure();
  const [undoHistoryOpened, { open: openUndoHistory, close: closeUndoHistory }] = useDisclosure(false);
  const location = useLocation();
  const { bookingsEnabled, maintenanceEnabled, kitsEnabled } = useFeatureSettingsStore((state) => ({
    bookingsEnabled: state.bookingsEnabled,
    maintenanceEnabled: state.maintenanceEnabled,
    kitsEnabled: state.kitsEnabled,
  }));
  const {
    history: undoHistory,
    undoAction,
    isLoading: isUndoHistoryLoading,
    isMutating: isUndoMutating,
    undoingActionId,
    error: undoError,
    refetch: refetchUndoHistory,
  } = useUndoHistory();

  const routeIsActive = (path: string | undefined) => {
    if (!path) return false;
    if (path === '/') {
      return location.pathname === '/';
    }
    // Exact match for list pages (e.g., /assets, /kits, /bookings)
    // These should only be active when on the exact path, not on detail pages
    if (path === '/assets' || path === '/kits' || path === '/bookings' || 
        path === '/categories' || path === '/asset-groups' || path === '/reports' || 
        path === '/damage-reports') {
      return location.pathname === path;
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
            <Title order={3}>{tNav('title')}</Title>
          </Group>
          <Tooltip label={tUndo('openHistoryTooltip')}>
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={openUndoHistory}
              aria-label={tUndo('openHistoryAria')}
            >
              <IconHistory size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          data-nav-label={tNav('items.dashboard')}
          component={Link}
          to="/"
          label={tNav('items.dashboard')}
          leftSection={<IconHome size={20} />}
          active={routeIsActive('/')}
          onClick={(event) => handleNavClick(event, { label: 'Dashboard', route: '/' })}
        />
        
        <NavLink
          data-nav-label={tNav('items.categories')}
          component={Link}
          to="/categories"
          label={tNav('items.categories')}
          leftSection={<IconCategory size={20} />}
          active={routeIsActive('/categories')}
          onClick={(event) => handleNavClick(event, { label: 'Categories', route: '/categories' })}
        />
        
        <NavLink
          data-nav-label={tNav('items.assets')}
          component={Link}
          to="/assets"
          label={tNav('items.assets')}
          leftSection={<IconBox size={20} />}
          active={routeIsActive('/assets')}
          onClick={(event) => handleNavClick(event, { label: 'Assets', route: '/assets' })}
        />

        <NavLink
          data-nav-label={tNav('items.assetModels')}
          component={Link}
          to="/asset-groups"
          label={tNav('items.assetModels')}
          leftSection={<IconUsersGroup size={20} />}
          active={routeIsActive('/asset-groups')}
          onClick={(event) => handleNavClick(event, { label: 'Asset Models', route: '/asset-groups' })}
        />

        {kitsEnabled && (
          <NavLink
            data-nav-label={tNav('items.kits')}
            component={Link}
            to="/kits"
            label={tNav('items.kits')}
            leftSection={<IconBoxMultiple size={20} />}
            active={routeIsActive('/kits')}
            onClick={(event) => handleNavClick(event, { label: 'Kits', route: '/kits' })}
          />
        )}

        {bookingsEnabled && (
          <NavLink
            data-nav-label={tNav('items.bookings')}
            component={Link}
            to="/bookings"
            label={tNav('items.bookings')}
            leftSection={<IconCalendarEvent size={20} />}
            active={routeIsActive('/bookings')}
            onClick={(event) => handleNavClick(event, { label: 'Bookings', route: '/bookings' })}
          />
        )}

        <NavLink
          data-nav-label={tNav('items.stockTake')}
          component={Link}
          to="/stock-take"
          label={tNav('items.stockTake')}
          leftSection={<IconClipboardList size={20} />}
          active={routeIsActive('/stock-take')}
          onClick={(event) => handleNavClick(event, { label: 'Stock Take', route: '/stock-take' })}
        />

        <NavLink
          data-nav-label={tNav('items.reports')}
          component={Link}
          to="/reports"
          label={tNav('items.reports')}
          leftSection={<IconChartBar size={20} />}
          active={routeIsActive('/reports')}
          onClick={(event) => handleNavClick(event, { label: 'Reports', route: '/reports' })}
        />

        {maintenanceEnabled && (
          <NavLink
            data-nav-label={tNav('items.maintenance')}
            component={Link}
            to="/maintenance"
            label={tNav('items.maintenance')}
            leftSection={<IconTool size={20} />}
            active={routeIsActive('/maintenance')}
            onClick={(event) => handleNavClick(event, { label: 'Maintenance', route: '/maintenance' })}
          />
        )}

        <NavLink
          data-nav-label={tNav('items.quickScan')}
          label={tNav('items.quickScan')}
          description={tNav('quickScanDescription', { shortcut: scanShortcut })}
          leftSection={<IconScan size={20} />}
          onClick={(event) => {
            event.preventDefault();
            close();
            onScanClick?.();
          }}
        />
        
        <NavLink
          data-nav-label={tNav('items.settings')}
          component={Link}
          to="/settings"
          label={tNav('items.settings')}
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
        title={tUndo('modalTitle')}
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
          undoingActionId={undoingActionId}
        />
      </Modal>
    </AppShell>
  );
}
