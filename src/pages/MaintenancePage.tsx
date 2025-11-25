import { useMemo, useState } from 'react';
import { Container, Stack, Title, Text, Tabs, Button, Modal, Select, Group } from '@mantine/core';
import { IconCalendarCheck, IconClipboardList, IconGauge, IconPlus, IconRefresh } from '@tabler/icons-react';
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
          <Title order={1}>Maintenance</Title>
          <Text size="lg" c="dimmed" mt="xs">
            Track and manage asset maintenance schedules and compliance
          </Text>
        </div>

        <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? 'dashboard')} keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="dashboard" leftSection={<IconGauge size={16} />}>
              Übersicht
            </Tabs.Tab>
            <Tabs.Tab value="plans" leftSection={<IconClipboardList size={16} />}>
              Plans
            </Tabs.Tab>
            <Tabs.Tab value="schedules" leftSection={<IconCalendarCheck size={16} />}>
              Wartungspläne
            </Tabs.Tab>
            <Tabs.Tab value="records" leftSection={<IconClipboardList size={16} />}>
              Wartungsprotokoll
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard" pt="md">
            <Stack gap="lg">
              <MaintenanceDashboard />
              <Group justify="flex-start" gap="sm" wrap="wrap">
                <Button leftSection={<IconPlus size={16} />} onClick={openCreateSchedule}>
                  Wartungsplan erstellen
                </Button>
                <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => openRecordModal()}>
                  Wartung erfassen
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="plans" pt="md">
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Title order={3}>Maintenance plans</Title>
                  <Text size="sm" c="dimmed">
                    Draft a plan, schedule maintenance windows, and track completion per asset.
                  </Text>
                </Stack>
                <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={resetPlan}>
                  Reset draft
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

        <Modal
          opened={scheduleModalOpen}
          onClose={closeScheduleModal}
          title={editingSchedule ? 'Wartungsplan bearbeiten' : 'Neuen Wartungsplan erstellen'}
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
          title="Wartung erfassen"
          size="lg"
        >
          <Stack gap="md">
            <Select
              label="Asset auswählen"
              placeholder="Asset auswählen"
              data={assetOptions}
              value={selectedAssetId || null}
              onChange={(value) => setSelectedAssetId(value ?? '')}
              searchable
              nothingFoundMessage={assetsLoading ? 'Lade Assets…' : 'Kein Asset gefunden'}
            />
            {scheduleContext && selectedAsset && (
              <Text size="sm" c="dimmed">
                Wartung gemäß Plan: {formatScheduleDescription(scheduleContext)}
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
              <Text c="dimmed">Bitte wählen Sie ein Asset aus, um eine Wartung zu erfassen.</Text>
            )}
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
