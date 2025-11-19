/**
 * MaintenanceRecordsSection component (T172 UI integration)
 * Displays maintenance history with filtering and quick access to logging
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconFilter, IconPlus, IconSearch } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { format } from 'date-fns';
import type { DataTableColumn, DataTableSortStatus } from 'mantine-datatable';
import { ListLoadingSkeleton } from '../common/ListLoadingSkeleton';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../common/EmptyState';
import { useDataViewState } from '../../hooks/useDataViewState';
import { DataViewLayout } from '../dataView/DataViewLayout';
import { DataViewTable } from '../dataView/DataViewTable';
import { useMaintenanceRecords } from '../../hooks/useMaintenance';
import type { Asset, MaintenanceRecord } from '../../types/entities';
import { MaintenanceTypeBadge } from './MaintenanceRecordList';

interface MaintenanceRecordsSectionProps {
  assets?: Asset[];
  assetsLoading?: boolean;
  onCreateRecord: (asset?: Asset) => void;
}

const maintenanceTypeOptions = (t: (s: string, v?: unknown) => string) => [
  { value: 'inspection', label: t('records.types.inspection') },
  { value: 'maintenance', label: t('records.types.maintenance') },
  { value: 'planned-repair', label: t('records.types.planned-repair') },
  { value: 'unplanned-repair', label: t('records.types.unplanned-repair') },
  { value: 'improvement', label: t('records.types.improvement') },
];

interface MaintenanceViewFilters extends Record<string, unknown> {
  search?: string;
  assetId?: string;
  type?: MaintenanceRecord['type'];
}

function getActiveMaintenanceFilterCount(filters: MaintenanceViewFilters): number {
  let count = 0;
  if (filters.search) count += 1;
  if (filters.assetId) count += 1;
  if (filters.type) count += 1;
  return count;
}

function getColumns(t: (s: string, v?: unknown) => string): DataTableColumn<MaintenanceRecord>[] {
  return [
    {
      accessor: 'date',
      title: t('records.columns.date'),
      sortable: true,
      render: (record) => format(new Date(record.date), 'MM/dd/yyyy'),
    },
    {
      accessor: 'asset.assetNumber',
      title: t('records.columns.asset'),
      sortable: true,
      render: (record) => (
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            {record.asset.name}
          </Text>
          <Text size="xs" c="dimmed">
            {record.asset.assetNumber}
          </Text>
        </Stack>
      ),
    },
    {
      accessor: 'type',
      title: t('records.columns.type'),
      sortable: true,
      render: (record) => <MaintenanceTypeBadge type={record.type} />,
    },
    {
      accessor: 'description',
      title: t('records.columns.description'),
      render: (record) => (
        <Text size="sm" lineClamp={2}>
          {record.description}
        </Text>
      ),
    },
    {
      accessor: 'performedByName',
      title: t('records.columns.performedBy'),
      sortable: true,
    },
    {
      accessor: 'cost',
      title: t('records.columns.cost'),
      sortable: true,
      render: (record) => (record.cost ? `${record.cost.toFixed(2)} €` : '-'),
    },
    {
      accessor: 'nextDueDate',
      title: t('records.columns.nextMaintenance'),
      sortable: true,
      render: (record) =>
        record.nextDueDate
          ? format(new Date(record.nextDueDate), 'MM/dd/yyyy')
          : '-',
    },
  ];
}

export function MaintenanceRecordsSection({ assets, assetsLoading, onCreateRecord }: MaintenanceRecordsSectionProps) {
  const { t } = useTranslation('maintenance');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const { data: records = [], isLoading, error } = useMaintenanceRecords();

  const {
    viewMode,
    setViewMode,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
    sortStatus,
    setSortStatus,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions,
  } = useDataViewState<MaintenanceViewFilters, DataTableSortStatus<MaintenanceRecord>>({
    storageKey: 'maintenance-data-view',
    defaultMode: 'table',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50],
    pageSizeStorageKey: 'maintenance-page-size',
    initialFilters: {},
    getActiveFilterCount: getActiveMaintenanceFilterCount,
    initialSort: {
      columnAccessor: 'date',
      direction: 'desc',
    },
  });

  useEffect(() => {
    if (error) {
      notifications.show({ title: t('common:app.error'), message: (error as Error).message, color: 'red' });
    }
  }, [error, t]);

  const assetOptions = useMemo(
    () =>
      (assets ?? []).map((asset) => ({
        value: asset.id,
        label: `${asset.assetNumber} · ${asset.name}`,
      })),
    [assets],
  );

  const assetMap = useMemo(() => {
    if (!assets) {
      return new Map<string, Asset>();
    }

    return new Map(assets.map((asset) => [asset.id, asset]));
  }, [assets]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.assetId && record.asset.id !== filters.assetId) {
        return false;
      }

      if (filters.type && record.type !== filters.type) {
        return false;
      }

      if (!filters.search) {
        return true;
      }

      const query = filters.search.toLowerCase();
      const haystack = [
        record.description,
        record.performedByName,
        record.asset.name,
        record.asset.assetNumber,
      ];

      return haystack
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [records, filters]);

  const sortedRecords = useMemo(() => {
    if (!sortStatus) {
      return filteredRecords;
    }

    const { columnAccessor, direction } = sortStatus;
    const sorted = [...filteredRecords];

    sorted.sort((a, b) => {
      const dirMultiplier = direction === 'asc' ? 1 : -1;

      switch (columnAccessor) {
        case 'date':
          return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dirMultiplier;
        case 'asset.assetNumber': {
          const aValue = `${a.asset.assetNumber} ${a.asset.name}`.toLowerCase();
          const bValue = `${b.asset.assetNumber} ${b.asset.name}`.toLowerCase();
          return aValue.localeCompare(bValue) * dirMultiplier;
        }
        case 'type':
          return a.type.localeCompare(b.type) * dirMultiplier;
        case 'performedByName':
          return a.performedByName.localeCompare(b.performedByName) * dirMultiplier;
        case 'cost':
          return ((a.cost ?? 0) - (b.cost ?? 0)) * dirMultiplier;
        case 'nextDueDate': {
          const aTime = a.nextDueDate ? new Date(a.nextDueDate).getTime() : 0;
          const bTime = b.nextDueDate ? new Date(b.nextDueDate).getTime() : 0;
          return (aTime - bTime) * dirMultiplier;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [filteredRecords, sortStatus]);

  const totalRecords = sortedRecords.length;

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedRecords.slice(start, end);
  }, [sortedRecords, page, pageSize]);

  const toggleFilters = () => {
    setFiltersOpen((previous) => !previous);
  };

  const columns = useMemo(() => getColumns(t), [t]);

  const filterContent = (
    <Stack gap="md">
      <Group align="flex-end" justify="space-between" wrap="wrap">
        <TextInput
          label={t('records.search.label')}
          placeholder={t('records.search.placeholder')}
          leftSection={<IconSearch size={16} />}
          value={filters.search ?? ''}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFilters((previous) => ({
              ...previous,
              search: value ? value : undefined,
            }));
          }}
          style={{ flex: 1, minWidth: 220 }}
        />

        <Group gap="sm" wrap="wrap">
          <Select
            label={t('records.filters.asset')}
            placeholder={t('records.filters.assetAll')}
            leftSection={<IconFilter size={16} />}
            data={assetOptions}
            value={filters.assetId ?? null}
            onChange={(value) => {
              setFilters((previous) => ({
                ...previous,
                assetId: value ?? undefined,
              }));
            }}
            searchable
            clearable
            disabled={assetsLoading}
          />

          <Select
            label={t('records.filters.type')}
            placeholder={t('records.filters.typeAll')}
            leftSection={<IconFilter size={16} />}
            data={maintenanceTypeOptions(t)}
            value={filters.type ?? null}
            onChange={(value) => {
              setFilters((previous) => ({
                ...previous,
                type: value ? (value as MaintenanceRecord['type']) : undefined,
              }));
            }}
            clearable
          />

          {hasActiveFilters && (
            <Button variant="subtle" onClick={resetFilters}>
              {t('records.filters.clear')}
            </Button>
          )}

          <Button leftSection={<IconPlus size={16} />} onClick={() => onCreateRecord()}>
            {t('page.actions.logMaintenance')}
          </Button>
        </Group>
      </Group>
    </Stack>
  );

  const primaryAction = {
    label: t('page.actions.logMaintenance'),
    icon: <IconPlus size={16} />,
    onClick: () => onCreateRecord(),
  };

  const isBusy = isLoading || assetsLoading;

  return (
    <DataViewLayout
      title={t('records.title')}
      mode={viewMode}
      availableModes={['table']}
      onModeChange={setViewMode}
      filtersOpen={filtersOpen}
      onToggleFilters={toggleFilters}
      hasActiveFilters={hasActiveFilters}
      activeFilterCount={activeFilterCount}
      primaryAction={primaryAction}
      filterContent={filterContent}
    >
      {error ? (
        <Card withBorder>
          <Text c="red">{t('records.errors.loadFailed')}</Text>
        </Card>
      ) : isBusy ? (
        <Card withBorder>
          <ListLoadingSkeleton rows={pageSize} height={60} />
        </Card>
      ) : totalRecords === 0 ? (
        <EmptyState
          title={t('records.empty.title')}
          message={
            filters.search || filters.type || filters.assetId
              ? t('records.empty.filterMessage')
              : t('records.empty.newMessage')
          }
          action={
            <Button leftSection={<IconPlus size={16} />} onClick={() => onCreateRecord()}>
              {t('page.actions.logMaintenance')}
            </Button>
          }
        />
      ) : (
        <Card withBorder>
          <DataViewTable<MaintenanceRecord>
            records={paginatedRecords}
            columns={columns}
            totalRecords={totalRecords}
            recordsPerPage={pageSize}
            recordsPerPageOptions={pageSizeOptions}
            page={page}
            onPageChange={setPage}
            onRecordsPerPageChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            highlightOnHover
            rowStyle={() => ({ cursor: 'pointer' })}
            onRowClick={({ record }) => {
              const asset = assetMap.get(record.asset.id);
              if (asset) {
                onCreateRecord(asset);
              } else {
                onCreateRecord();
              }
            }}
            paginationText={({ from, to, totalRecords: total }) =>
              t('records.pagination', { from, to, total })
            }
            noRecordsText={
              hasActiveFilters
                ? t('records.empty.filterMessage')
                : t('records.empty.noRecords')
            }
          />
        </Card>
      )}
    </DataViewLayout>
  );
}
