/**
 * MaintenanceScheduleList component (T173 UI integration)
 * Displays all maintenance schedules with filtering and actions
 */

import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Button, Group, Modal, Select, Stack, Text, TextInput, Tooltip } from '@mantine/core';
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

const scheduleTypeOptions = [
  { value: 'all', label: 'All types' },
  { value: 'time-based', label: 'Time-based' },
  { value: 'usage-based', label: 'Usage-based' },
  { value: 'event-based', label: 'Event-based' },
  { value: 'fixed-date', label: 'Fixed date' },
];

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due-soon', label: 'Due soon' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'unscheduled', label: 'No due date' },
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
): DataTableColumn<MaintenanceSchedule>[] {
  return [
    {
      accessor: 'assetId',
      title: 'Asset',
      render: (schedule) => {
        const asset = assetMap.get(schedule.assetId);
        if (!asset) {
          return (
            <Stack gap={2}>
              <Text fw={500}>Unknown asset</Text>
              <Text size="xs" c="dimmed">ID: {schedule.assetId}</Text>
            </Stack>
          );
        }
        return (
          <Stack gap={2}>
            <Text fw={500}>{asset.assetNumber} · {asset.name}</Text>
            <Text size="xs" c="dimmed">Category: {asset.assetType.name}</Text>
          </Stack>
        );
      },
    },
    {
      accessor: 'scheduleType',
      title: 'Interval',
      render: (schedule) => (
        <Stack gap={2}>
          <Text size="sm">{formatScheduleDescription(schedule)}</Text>
          {schedule.lastPerformed && (
            <Text size="xs" c="dimmed">Last performed: {new Date(schedule.lastPerformed).toLocaleDateString()}</Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: 'nextDue',
      title: 'Next due',
      render: (schedule) => (
        <Group gap="sm">
          <MaintenanceReminderBadge schedule={schedule} />
          {schedule.reminderDaysBefore > 0 && (
            <Badge color="blue" variant="light" size="sm">
              Reminder {schedule.reminderDaysBefore} days before
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
              <Tooltip label="Log maintenance">
                <ActionIcon
                  variant="light"
                  color="green"
                  onClick={(event) => {
                    event.stopPropagation();
                    onLogMaintenance(asset, schedule);
                  }}
                  aria-label="Log maintenance"
                >
                  <IconTools size={18} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label="Edit">
              <ActionIcon
                variant="light"
                color="blue"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(schedule);
                }}
                aria-label="Edit maintenance plan"
              >
                <IconEdit size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete">
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(schedule);
                }}
                aria-label="Delete maintenance plan"
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
        title: 'Maintenance plan deleted',
        message: 'The maintenance plan was removed.',
        color: 'green',
        icon: <IconCheck />,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete maintenance plan';
      notifications.show({
        title: 'Error',
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
            label="Search"
            placeholder="Asset or interval"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            style={{ flex: 1, minWidth: 220 }}
            disabled
          />
          <Group gap="sm" wrap="wrap">
            <Select label="Asset" placeholder="All" data={[]} disabled />
            <Select label="Type" data={scheduleTypeOptions} value={typeFilter} disabled />
            <Select label="Status" data={statusOptions} value={statusFilter} disabled />
            <Button leftSection={<IconPlus size={16} />} disabled>
              New plan
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
        title="Failed to load"
        message={(error as Error).message}
      />
    );
  }

  const columns = getColumns(assetMap, onEditSchedule, handleDeleteClick, onLogMaintenance);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <TextInput
          label="Search"
          placeholder="Asset or interval"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <Group gap="sm" wrap="wrap">
          <Select
            label="Asset"
            placeholder="All assets"
            data={[
              { value: 'all', label: 'All assets' },
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
            label="Type"
            data={scheduleTypeOptions}
            value={typeFilter}
            onChange={(value) => setTypeFilter(value ?? 'all')}
          />
          <Select
            label="Status"
            data={statusOptions}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value ?? 'all')}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={onCreateSchedule}>
            New plan
          </Button>
        </Group>
      </Group>

      {filteredSchedules.length === 0 ? (
        <EmptyState
          title="No maintenance plans"
          message={searchQuery || typeFilter !== 'all' || assetFilter !== 'all' || statusFilter !== 'all'
            ? 'No maintenance plans match the current filters.'
            : 'Create the first maintenance plan for your assets.'}
          action={<Button leftSection={<IconPlus size={16} />} onClick={onCreateSchedule}>Create maintenance plan</Button>}
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
        title="Delete maintenance plan"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete this maintenance plan?
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
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              loading={deleteSchedule.isPending}
            >
              Delete
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
