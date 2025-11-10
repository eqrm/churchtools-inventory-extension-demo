import { useMemo, useState } from 'react';
import { Button, Card, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconFilter, IconSearch } from '@tabler/icons-react';
import type { DataTableColumn, DataTableSortStatus } from 'mantine-datatable';
import { useStockTakeSessions } from '../../hooks/useStockTake';
import { useDataViewState } from '../../hooks/useDataViewState';
import type { StockTakeSession, StockTakeStatus } from '../../types/entities';
import { formatDateOnly } from '../../utils/formatters';
import { DataViewLayout } from '../dataView/DataViewLayout';
import { DataViewTable } from '../dataView/DataViewTable';
import { ListLoadingSkeleton } from '../common/ListLoadingSkeleton';
import { EmptyState } from '../common/EmptyState';

interface StockTakeSessionListProps {
  onView?: (session: StockTakeSession) => void;
  initialStatus?: StockTakeStatus;
}

interface StockTakeViewFilters extends Record<string, unknown> {
  search?: string;
  status?: StockTakeStatus;
}

function getActiveStockTakeFilterCount(filters: StockTakeViewFilters): number {
  let count = 0;
  if (filters.search) count += 1;
  if (filters.status) count += 1;
  return count;
}

function getColumns(onView?: (session: StockTakeSession) => void): DataTableColumn<StockTakeSession>[] {
  return [
    {
      accessor: 'startDate',
      title: 'Start Date',
      sortable: true,
      render: (session) => formatDateOnly(session.startDate),
    },
    {
      accessor: 'nameReason',
      title: 'Reason / Name',
      render: (session) => (
        <Text size="sm" lineClamp={2} c={session.nameReason ? undefined : 'dimmed'}>
          {session.nameReason?.trim() || 'Not specified'}
        </Text>
      ),
    },
    {
      accessor: 'status',
      title: 'Status',
      sortable: true,
    },
    {
      accessor: 'conductedByName',
      title: 'Conducted By',
      sortable: true,
    },
    {
      accessor: 'actions',
      title: '',
      width: 120,
      render: (session) => (
        <Button
          size="xs"
          variant="subtle"
          onClick={(event) => {
            event.stopPropagation();
            onView?.(session);
          }}
        >
          View
        </Button>
      ),
    },
  ];
}

export function StockTakeSessionList({ onView, initialStatus }: StockTakeSessionListProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);

  const initialFilters = useMemo<StockTakeViewFilters>(() => {
    if (!initialStatus) {
      return {};
    }

    return { status: initialStatus };
  }, [initialStatus]);

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
  } = useDataViewState<StockTakeViewFilters, DataTableSortStatus<StockTakeSession>>({
    storageKey: 'stocktake-data-view',
    defaultMode: 'table',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50],
    pageSizeStorageKey: 'stocktake-page-size',
    initialFilters,
    initialFiltersKey: JSON.stringify(initialFilters),
    getActiveFilterCount: getActiveStockTakeFilterCount,
    initialSort: {
      columnAccessor: 'startDate',
      direction: 'desc',
    },
  });

  const { data: sessions = [], isLoading } = useStockTakeSessions(
    filters.status ? { status: filters.status } : undefined,
  );

  const filteredSessions = useMemo(() => {
    if (!filters.search) {
      return sessions;
    }

    const query = filters.search.toLowerCase();
    return sessions.filter((session) => {
      return (
        session.nameReason?.toLowerCase().includes(query) ||
        session.conductedByName?.toLowerCase().includes(query) ||
        session.status.toLowerCase().includes(query)
      );
    });
  }, [sessions, filters.search]);

  const sortedSessions = useMemo(() => {
    if (!sortStatus) {
      return filteredSessions;
    }

    const { columnAccessor, direction } = sortStatus;
    const sorted = [...filteredSessions];
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (columnAccessor) {
        case 'startDate':
          return (new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) * multiplier;
        case 'status':
          return a.status.localeCompare(b.status) * multiplier;
        case 'conductedByName':
          return (a.conductedByName ?? '').localeCompare(b.conductedByName ?? '') * multiplier;
        default:
          return 0;
      }
    });

    return sorted;
  }, [filteredSessions, sortStatus]);

  const totalRecords = sortedSessions.length;

  const paginatedSessions = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedSessions.slice(start, end);
  }, [sortedSessions, page, pageSize]);

  const columns = useMemo(() => getColumns(onView), [onView]);

  const toggleFilters = () => {
    setFiltersOpen((previous) => !previous);
  };

  const filterContent = (
    <Stack gap="md">
      <Group align="flex-end" justify="space-between" wrap="wrap">
        <TextInput
          label="Search"
          placeholder="Search by reason, status, or owner"
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

        <Group gap="sm">
          <Select
            label="Status"
            placeholder="All statuses"
            leftSection={<IconFilter size={16} />}
            value={filters.status ?? null}
            onChange={(value) => {
              setFilters((previous) => ({
                ...previous,
                status: value ? (value as StockTakeStatus) : undefined,
              }));
            }}
            data={[
              { value: 'draft', label: 'Draft' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'archived', label: 'Archived' },
            ]}
            clearable
          />

          {hasActiveFilters && (
            <Button variant="subtle" onClick={resetFilters}>
              Clear filters
            </Button>
          )}
        </Group>
      </Group>
    </Stack>
  );

  return (
    <DataViewLayout
      title="Stock Take Sessions"
      mode={viewMode}
      availableModes={['table']}
      onModeChange={setViewMode}
      filtersOpen={filtersOpen}
      onToggleFilters={toggleFilters}
      hasActiveFilters={hasActiveFilters}
      activeFilterCount={activeFilterCount}
      filterContent={filterContent}
    >
      {isLoading ? (
        <Card withBorder>
          <ListLoadingSkeleton rows={pageSize} height={60} />
        </Card>
      ) : totalRecords === 0 ? (
        <EmptyState
          title="No stock take sessions"
          message={
            filters.search || filters.status
              ? 'No stock take sessions match the current filters.'
              : 'Start a new stock take to populate this list.'
          }
        />
      ) : (
        <Card withBorder>
          <DataViewTable<StockTakeSession>
            records={paginatedSessions}
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
            highlightOnHover={Boolean(onView)}
            rowStyle={() => (onView ? { cursor: 'pointer' } : undefined)}
            onRowClick={({ record }) => {
              onView?.(record);
            }}
            paginationText={({ from, to, totalRecords: total }) =>
              `Showing ${from} to ${to} of ${total} sessions`
            }
            noRecordsText={
              hasActiveFilters
                ? 'No stock take sessions match the current filters.'
                : 'No stock take sessions found.'
            }
          />
        </Card>
      )}
    </DataViewLayout>
  );
}
