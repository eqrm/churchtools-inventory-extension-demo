/**
 * MaintenanceScheduleList component (T173 UI integration)
 * Displays all maintenance schedules with filtering and actions
 */

import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Button, Group, Modal, Select, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconCheck, IconEdit, IconPlus, IconTrash, IconTools, IconAlertCircle } from '@tabler/icons-react';
import { DataTable, type DataTableColumn } from 'mantine-datatable';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { useMaintenanceSchedules, useDeleteMaintenanceSchedule } from '../../hooks/useMaintenance';
import { formatScheduleDescription, daysUntilDue } from '../../utils/maintenanceCalculations';
import { MaintenanceReminderBadge } from './MaintenanceReminderBadge';
import { ListLoadingSkeleton } from '../common/ListLoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import type { Asset, MaintenanceSchedule } from '../../types/entities';

interface MaintenanceScheduleListProps {
  assets?: Asset[];
  assetsLoading?: boolean;
  onCreateSchedule: () => void;
  onEditSchedule: (schedule: MaintenanceSchedule) => void;
  onLogMaintenance: (asset: Asset, schedule: MaintenanceSchedule) => void;
}

const scheduleTypeOptions = (t: (s: string, v?: unknown) => string) => [
  { value: 'all', label: t('scheduleList.types.all') },
  { value: 'time-based', label: t('scheduleList.types.timeBased') },
  { value: 'usage-based', label: t('scheduleList.types.usageBased') },
  { value: 'event-based', label: t('scheduleList.types.eventBased') },
  { value: 'fixed-date', label: t('scheduleList.types.fixedDate') },
];

const statusOptions = (t: (s: string, v?: unknown) => string) => [
  { value: 'all', label: t('scheduleList.statuses.all') },
  { value: 'overdue', label: t('scheduleList.statuses.overdue') },
  { value: 'due-soon', label: t('scheduleList.statuses.dueSoon') },
  { value: 'scheduled', label: t('scheduleList.statuses.scheduled') },
  { value: 'unscheduled', label: t('scheduleList.statuses.unscheduled') },
];

function determineStatus(schedule: MaintenanceSchedule): 'overdue' | 'due-soon' | 'scheduled' | 'unscheduled' {
  if (!schedule.nextDue) {
    return 'unscheduled';
  }

  const diff = daysUntilDue(schedule);
  if (diff === null) {
    return 'unscheduled';
  }
  if (diff < 0) {
    return 'overdue';
  }
  if (diff <= schedule.reminderDaysBefore) {
    return 'due-soon';
  }
  return 'scheduled';
}

function getColumns(
  assetMap: Map<string, Asset>,
  onEdit: (schedule: MaintenanceSchedule) => void,
  onDelete: (schedule: MaintenanceSchedule) => void,
  onLogMaintenance: (asset: Asset, schedule: MaintenanceSchedule) => void,
  t: (s: string, v?: unknown) => string,
): DataTableColumn<MaintenanceSchedule>[] {
  return [
    {
      accessor: 'assetId',
      title: t('scheduleList.columns.asset'),
      render: (schedule) => {
        const asset = assetMap.get(schedule.assetId);
        if (!asset) {
          return (
            <Stack gap={2}>
              <Text fw={500}>{t('scheduleList.unknownAsset')}</Text>
              <Text size="xs" c="dimmed">{t('scheduleList.unknownAssetId', { id: schedule.assetId })}</Text>
            </Stack>
          );
        }
        return (
          <Stack gap={2}>
            <Text fw={500}>{asset.assetNumber} · {asset.name}</Text>
            <Text size="xs" c="dimmed">{t('scheduleList.assetCategory', { category: asset.assetType.name })}</Text>
          </Stack>
        );
      },
    },
    {
      accessor: 'scheduleType',
      title: t('scheduleList.columns.interval'),
      render: (schedule) => (
        <Stack gap={2}>
          <Text size="sm">{formatScheduleDescription(schedule)}</Text>
          {schedule.lastPerformed && (
            <Text size="xs" c="dimmed">{t('scheduleList.lastPerformed', { date: new Date(schedule.lastPerformed).toLocaleDateString() })}</Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: 'nextDue',
      title: t('scheduleList.columns.nextDue'),
      render: (schedule) => (
        <Group gap="sm">
          <MaintenanceReminderBadge schedule={schedule} />
          {schedule.reminderDaysBefore > 0 && (
            <Badge color="blue" variant="light" size="sm">
              {t('scheduleList.reminderBefore', { count: schedule.reminderDaysBefore })}
            </Badge>
          )}
        </Group>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      textAlign: 'right',
      width: 120,
      render: (schedule) => {
        const asset = assetMap.get(schedule.assetId);
        return (
          <Group gap="xs" justify="flex-end" wrap="nowrap">
            {asset && (
              <Tooltip label={t('page.actions.logMaintenance')}>
                <ActionIcon
                  variant="light"
                  color="green"
                  onClick={(event) => {
                    event.stopPropagation();
                    onLogMaintenance(asset, schedule);
                  }}
                  aria-label={t('page.actions.logMaintenance')}
                >
                  <IconTools size={18} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label={t('scheduleList.actions.edit')}>
              <ActionIcon
                variant="light"
                color="blue"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(schedule);
                }}
                aria-label={t('scheduleList.actions.edit')}
              >
                <IconEdit size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('scheduleList.actions.delete')}>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(schedule);
                }}
                aria-label={t('scheduleList.actions.delete')}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        );
      },
    },
  ];
}

export function MaintenanceScheduleList({
  assets,
  assetsLoading,
  onCreateSchedule,
  onEditSchedule,
  onLogMaintenance,
}: MaintenanceScheduleListProps) {
  const { t } = useTranslation('maintenance');
  const navigate = useNavigate();
  const { data: schedules, isLoading, error } = useMaintenanceSchedules();
  const deleteSchedule = useDeleteMaintenanceSchedule();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<MaintenanceSchedule | null>(null);

  const assetMap = useMemo(() => {
    if (!assets) return new Map<string, Asset>();
    return new Map(assets.map((asset) => [asset.id, asset]));
  }, [assets]);

  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];

    return schedules.filter((schedule) => {
      const asset = assetMap.get(schedule.assetId);

      if (assetFilter !== 'all' && schedule.assetId !== assetFilter) {
        return false;
      }

      if (typeFilter !== 'all' && schedule.scheduleType !== typeFilter) {
        return false;
      }

      if (statusFilter !== 'all' && determineStatus(schedule) !== statusFilter) {
        return false;
      }

      if (!searchQuery) {
        return true;
      }

      const query = searchQuery.toLowerCase();
      const matchesAsset = asset
        ? `${asset.assetNumber} ${asset.name}`.toLowerCase().includes(query)
        : false;
      const matchesDescription = formatScheduleDescription(schedule).toLowerCase().includes(query);
      return matchesAsset || matchesDescription;
    });
  }, [schedules, assetMap, assetFilter, typeFilter, statusFilter, searchQuery]);

  const handleDeleteClick = (schedule: MaintenanceSchedule) => {
    setScheduleToDelete(schedule);
    setDeleteModalOpened(true);
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;

    try {
      await deleteSchedule.mutateAsync(scheduleToDelete.id);
      notifications.show({
        title: t('messages.scheduleDeleted'),
        message: t('messages.scheduleDeletedDescription'),
        color: 'green',
        icon: <IconCheck />,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.scheduleDeleteFailed');
      notifications.show({
        title: t('common:app.error'),
        message,
        color: 'red',
        icon: <IconAlertCircle />, // intentionally using alert icon
      });
    } finally {
      setDeleteModalOpened(false);
      setScheduleToDelete(null);
    }
  };

  if (isLoading || assetsLoading) {
    return (
      <Stack gap="md">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <TextInput
            label={t('scheduleList.search.label')}
            placeholder={t('scheduleList.search.placeholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            style={{ flex: 1, minWidth: 220 }}
            disabled
          />
          <Group gap="sm" wrap="wrap">
            <Select label={t('scheduleList.filters.asset')} placeholder={t('scheduleList.filters.assetAll')} data={[]} disabled />
            <Select label={t('scheduleList.filters.type')} data={scheduleTypeOptions(t)} value={typeFilter} disabled />
            <Select label={t('scheduleList.filters.status')} data={statusOptions(t)} value={statusFilter} disabled />
            <Button leftSection={<IconPlus size={16} />} disabled>
              {t('page.actions.createPlan')}
            </Button>
          </Group>
        </Group>
        <ListLoadingSkeleton rows={8} />
      </Stack>
    );
  }

  if (error) {
    return (
      <AlertDisplay
        title={t('common:app.error')}
        message={(error as Error).message}
      />
    );
  }

  const columns = getColumns(assetMap, onEditSchedule, handleDeleteClick, onLogMaintenance, t);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <TextInput
          label={t('scheduleList.search.label')}
          placeholder={t('scheduleList.search.placeholder')}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <Group gap="sm" wrap="wrap">
          <Select
            label={t('scheduleList.filters.asset')}
            placeholder={t('scheduleList.filters.assetAll')}
            data={[
              { value: 'all', label: t('scheduleList.filters.assetAll') },
              ...(assets ?? []).map((asset) => ({
                value: asset.id,
                label: `${asset.assetNumber} · ${asset.name}`,
              })),
            ]}
            value={assetFilter}
            onChange={(value) => setAssetFilter(value ?? 'all')}
            searchable
          />
          <Select
            label={t('scheduleList.filters.type')}
            data={scheduleTypeOptions(t)}
            value={typeFilter}
            onChange={(value) => setTypeFilter(value ?? 'all')}
          />
          <Select
            label={t('scheduleList.filters.status')}
            data={statusOptions(t)}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value ?? 'all')}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={onCreateSchedule}>
            {t('page.actions.createPlan')}
          </Button>
        </Group>
      </Group>

      {filteredSchedules.length === 0 ? (
        <EmptyState
          title={t('scheduleList.empty.title')}
          message={searchQuery || typeFilter !== 'all' || assetFilter !== 'all' || statusFilter !== 'all'
            ? t('scheduleList.empty.filterMessage')
            : t('scheduleList.empty.newMessage')}
          action={<Button leftSection={<IconPlus size={16} />} onClick={onCreateSchedule}>{t('scheduleList.empty.action')}</Button>}
        />
      ) : (
        <DataTable
          highlightOnHover
          withColumnBorders={false}
          records={filteredSchedules}
          columns={columns}
          onRowClick={({ record }) => navigate(`/assets/${record.assetId}`)}
          rowStyle={() => ({ cursor: 'pointer' })}
        />
      )}

      <Modal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setScheduleToDelete(null);
        }}
        title={t('scheduleList.delete.title')}
        centered
      >
        <Stack gap="md">
          <Text>
            {t('scheduleList.delete.confirm')}
            {scheduleToDelete && (
              <>
                <br />
                <strong>{formatScheduleDescription(scheduleToDelete)}</strong>
              </>
            )}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => {
              setDeleteModalOpened(false);
              setScheduleToDelete(null);
            }}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              loading={deleteSchedule.isPending}
            >
              {t('scheduleList.actions.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

interface AlertDisplayProps {
  title: string;
  message: string;
}

function AlertDisplay({ title, message }: AlertDisplayProps) {
  return (
    <Stack gap="sm" p="md" style={{ border: '1px solid var(--mantine-color-red-4)', borderRadius: 8 }}>
      <Group gap="xs">
        <IconAlertCircle size={20} color="var(--mantine-color-red-6)" />
        <Text fw={600}>{title}</Text>
      </Group>
      <Text c="dimmed">{message}</Text>
    </Stack>
  );
}
