import { useMemo, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { Container, Stack, Title, Text, Tabs, Button, Modal, Select, Group } from '@mantine/core';
import { IconCalendarCheck, IconClipboardList, IconGauge, IconPlus, IconRefresh, IconTool } from '@tabler/icons-react';
import { MaintenanceDashboard } from '../components/maintenance/MaintenanceDashboard';
import { MaintenanceScheduleList } from '../components/maintenance/MaintenanceScheduleList';
import { MaintenanceRecordsSection } from '../components/maintenance/MaintenanceRecordsSection';
import { MaintenanceScheduleForm } from '../components/maintenance/MaintenanceScheduleForm';
import { MaintenanceRecordForm } from '../components/maintenance/MaintenanceRecordForm';
import { MaintenancePlanForm } from '../components/maintenance/MaintenancePlanForm';
import { MaintenanceCompletionTable } from '../components/maintenance/MaintenanceCompletionTable';
import { useAssets } from '../hooks/useAssets';
import { formatScheduleDescription } from '../utils/maintenanceCalculations';
import type { Asset, MaintenanceSchedule } from '../types/entities';
import { useMaintenancePlanStore } from '../state/maintenance/planStore';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { routes } from '../router/routes';

/**
 * Maintenance Page - Central hub for maintenance management
 * Provides:
 * - Upcoming maintenance schedules
 * - Overdue maintenance alerts
 * - Maintenance compliance tracking
 * - Quick access to maintenance records
 */
export function MaintenancePage() {
  const { data: assets = [], isLoading: assetsLoading } = useAssets();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [scheduleContext, setScheduleContext] = useState<MaintenanceSchedule | null>(null);
  const resetPlan = useMaintenancePlanStore((store) => store.resetPlan);
  const { t } = useTranslation('maintenance');
  const matchRoot = useMatch({ path: routes.maintenance.root(), end: true });
  const isRootRoute = Boolean(matchRoot);

  const assetOptions = useMemo(
    () => assets.map((asset) => ({ value: asset.id, label: `${asset.assetNumber} · ${asset.name}` })),
    [assets],
  );

  const selectedAsset: Asset | undefined = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId),
    [assets, selectedAssetId],
  );

  const openCreateSchedule = () => {
    setEditingSchedule(null);
    setScheduleModalOpen(true);
    setActiveTab('schedules');
  };

  const openEditSchedule = (schedule: MaintenanceSchedule) => {
    setEditingSchedule(schedule);
    setScheduleModalOpen(true);
    setActiveTab('schedules');
  };

  const closeScheduleModal = () => {
    setScheduleModalOpen(false);
    setEditingSchedule(null);
  };

  const openRecordModal = (asset?: Asset, schedule?: MaintenanceSchedule) => {
    setSelectedAssetId(asset?.id ?? '');
    setScheduleContext(schedule ?? null);
    setRecordModalOpen(true);
    setActiveTab('records');
  };

  const closeRecordModal = () => {
    setRecordModalOpen(false);
    setSelectedAssetId('');
    setScheduleContext(null);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Group justify="space-between" align="flex-start">
            <Stack gap={4} flex={1}>
              <Title order={1}>{t('page.title')}</Title>
              <Text size="lg" c="dimmed">
                {t('page.description')}
              </Text>
            </Stack>
            <Group gap="xs" wrap="wrap">
              <Button component={Link} to={routes.maintenance.dashboard()} variant="light" leftSection={<IconGauge size={16} />}>
                {t('page.links.dashboard')}
              </Button>
              <Button component={Link} to={routes.maintenance.companies()} variant="light" leftSection={<IconTool size={16} />}>
                {t('page.links.companies')}
              </Button>
              <Button component={Link} to={routes.maintenance.rules.list()} variant="light" leftSection={<IconClipboardList size={16} />}>
                {t('page.links.rules')}
              </Button>
              <Button component={Link} to={routes.maintenance.workOrders.list()} variant="light" leftSection={<IconCalendarCheck size={16} />}>
                {t('page.links.workOrders')}
              </Button>
            </Group>
          </Group>
        </div>

        {isRootRoute ? (
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? 'dashboard')} keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="dashboard" leftSection={<IconGauge size={16} />}>
              {t('page.tabs.dashboard')}
            </Tabs.Tab>
            <Tabs.Tab value="plans" leftSection={<IconClipboardList size={16} />}>
              {t('page.tabs.plans')}
            </Tabs.Tab>
            <Tabs.Tab value="schedules" leftSection={<IconCalendarCheck size={16} />}>
              {t('page.tabs.schedules')}
            </Tabs.Tab>
            <Tabs.Tab value="records" leftSection={<IconClipboardList size={16} />}>
              {t('page.tabs.records')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard" pt="md">
            <Stack gap="lg">
              <MaintenanceDashboard />
              <Group justify="flex-start" gap="sm" wrap="wrap">
                <Button leftSection={<IconPlus size={16} />} onClick={openCreateSchedule}>
                  {t('page.actions.createPlan')}
                </Button>
                <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => openRecordModal()}>
                  {t('page.actions.logMaintenance')}
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="plans" pt="md">
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Title order={3}>{t('page.plans.title')}</Title>
                  <Text size="sm" c="dimmed">
                    {t('page.plans.description')}
                  </Text>
                </Stack>
                <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={resetPlan}>
                  {t('page.actions.resetDraft')}
                </Button>
              </Group>

              <MaintenancePlanForm />
              <MaintenanceCompletionTable />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="schedules" pt="md">
            <MaintenanceScheduleList
              assets={assets}
              assetsLoading={assetsLoading}
              onCreateSchedule={openCreateSchedule}
              onEditSchedule={openEditSchedule}
              onLogMaintenance={(asset, schedule) => openRecordModal(asset, schedule)}
            />
          </Tabs.Panel>

          <Tabs.Panel value="records" pt="md">
            <MaintenanceRecordsSection
              assets={assets}
              assetsLoading={assetsLoading}
              onCreateRecord={(asset) => openRecordModal(asset)}
            />
          </Tabs.Panel>
          </Tabs>
        ) : (
          <Outlet />
        )}

        <Modal
          opened={scheduleModalOpen}
          onClose={closeScheduleModal}
          title={editingSchedule ? t('page.scheduleModal.editTitle') : t('page.scheduleModal.createTitle')}
          size="lg"
        >
          <MaintenanceScheduleForm
            assetId={editingSchedule?.assetId}
            schedule={editingSchedule ?? undefined}
            onSuccess={closeScheduleModal}
            onCancel={closeScheduleModal}
          />
        </Modal>

        <Modal
          opened={recordModalOpen}
          onClose={closeRecordModal}
          title={t('page.records.modalTitle')}
          size="lg"
        >
          <Stack gap="md">
            <Select
              label={t('page.records.assetSelectLabel')}
              placeholder={t('page.records.assetSelectPlaceholder')}
              data={assetOptions}
              value={selectedAssetId || null}
              onChange={(value) => setSelectedAssetId(value ?? '')}
              searchable
              nothingFoundMessage={assetsLoading ? t('page.records.loadingAssets') : t('page.records.nothingFound')}
            />
            {scheduleContext && selectedAsset && (
              <Text size="sm" c="dimmed">
                {t('page.records.scheduledMaintenance', {
                  description: formatScheduleDescription(scheduleContext),
                })}
              </Text>
            )}
            {selectedAsset ? (
              <MaintenanceRecordForm
                assetId={selectedAsset.id}
                assetNumber={selectedAsset.assetNumber}
                assetName={selectedAsset.name}
                onSuccess={closeRecordModal}
                onCancel={closeRecordModal}
              />
            ) : (
              <Text c="dimmed">{t('page.records.selectAssetPrompt')}</Text>
            )}
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
