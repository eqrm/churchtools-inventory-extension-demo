import { useMemo, useState } from 'react';
import { Badge, Button, Card, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconBoxMultiple, IconFilter, IconPlus, IconSearch } from '@tabler/icons-react';
import type { DataTableColumn } from 'mantine-datatable';
import { useNavigate } from 'react-router-dom';
import { useKits } from '../../hooks/useKits';
import { useDataViewState } from '../../hooks/useDataViewState';
import type { Kit } from '../../types/entities';
import { EmptyState } from '../common/EmptyState';
import { ListLoadingSkeleton } from '../common/ListLoadingSkeleton';
import { DataViewLayout } from '../dataView/DataViewLayout';
import { DataViewTable } from '../dataView/DataViewTable';

const KIT_PAGE_SIZE_OPTIONS = [10, 20, 50];
const KIT_PAGE_SIZE_STORAGE_KEY = 'kit-list-page-size';
const DEFAULT_KIT_PAGE_SIZE = 20;

interface KitListProps {
  onKitClick?: (kitId: string) => void;
  onCreateClick?: () => void;
}

type KitViewFilters = {
  search?: string;
  type?: 'fixed' | 'flexible';
};

function getActiveKitFilterCount(filters: KitViewFilters): number {
  let count = 0;
  if (filters.search) count += 1;
  if (filters.type) count += 1;
  return count;
}

function useKitColumns(): DataTableColumn<Kit>[] {
  return useMemo<DataTableColumn<Kit>[]>(
    () => [
      { accessor: 'name', title: 'Name', sortable: true },
      {
        accessor: 'type',
        title: 'Type',
        sortable: true,
        render: (kit) => (
          <Badge color={kit.type === 'fixed' ? 'blue' : 'green'}>
            {kit.type === 'fixed' ? 'Fixed' : 'Flexible'}
          </Badge>
        ),
      },
    ],
    [],
  );
}

export function KitList({ onKitClick, onCreateClick }: KitListProps) {
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const { data: kitsData, isLoading, error } = useKits();
  const kits: Kit[] = kitsData ?? [];

  const {
    viewMode,
    setViewMode,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions,
  } = useDataViewState<KitViewFilters>({
    storageKey: 'kit-data-view',
    defaultMode: 'table',
    defaultPageSize: DEFAULT_KIT_PAGE_SIZE,
    pageSizeOptions: KIT_PAGE_SIZE_OPTIONS,
    pageSizeStorageKey: KIT_PAGE_SIZE_STORAGE_KEY,
    getActiveFilterCount: getActiveKitFilterCount,
  });

  const columns = useKitColumns();

  const filteredKits = useMemo(() => {
    return kits.filter((kit) => {
      const matchesType = filters.type ? kit.type === filters.type : true;
      const query = filters.search?.trim().toLowerCase();

      if (!query) {
        return matchesType;
      }

      const haystack = [kit.name, kit.description];
      const matchesSearch = haystack
        .filter((item): item is string => Boolean(item))
        .some((item) => item.toLowerCase().includes(query));

      return matchesType && matchesSearch;
    });
  }, [kits, filters]);

  const totalRecords = filteredKits.length;

  const paginatedKits = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredKits.slice(start, end);
  }, [filteredKits, page, pageSize]);

  const handleToggleFilters = () => {
    setFiltersOpen((prev) => !prev);
  };

  const handleKitRowClick = (kit: Kit) => {
    if (onKitClick) {
      onKitClick(kit.id);
      return;
    }

    navigate(`/kits/${kit.id}`);
  };

  const filterContent = (
    <Stack gap="md">
      <Group align="flex-end" gap="md" wrap="wrap">
        <TextInput
          label="Search"
          placeholder="Search kits by name or description"
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

        <Select
          label="Kit Type"
          placeholder="All types"
          leftSection={<IconFilter size={16} />}
          data={[
            { value: 'fixed', label: 'Fixed' },
            { value: 'flexible', label: 'Flexible' },
          ]}
          value={filters.type ?? null}
          onChange={(value) => {
            setFilters((previous) => ({
              ...previous,
              type: value ? (value as 'fixed' | 'flexible') : undefined,
            }));
          }}
          clearable
          searchable
        />

        {hasActiveFilters && (
          <Button variant="subtle" onClick={resetFilters}>
            Clear filters
          </Button>
        )}
      </Group>
    </Stack>
  );

  const primaryAction = onCreateClick
    ? {
        label: 'Create Kit',
        icon: <IconPlus size={16} />,
        onClick: onCreateClick,
      }
    : undefined;

  if (error) {
    return (
      <Card withBorder>
        <Text c="red">Fehler beim Laden der Kits</Text>
      </Card>
    );
  }

  return (
    <DataViewLayout
      title="Equipment Kits"
      mode={viewMode}
      availableModes={['table']}
      onModeChange={setViewMode}
      filtersOpen={filtersOpen}
      onToggleFilters={handleToggleFilters}
      hasActiveFilters={hasActiveFilters}
      activeFilterCount={activeFilterCount}
      primaryAction={primaryAction}
      filterContent={filterContent}
    >
      {isLoading ? (
        <Card withBorder>
          <ListLoadingSkeleton rows={pageSize} height={60} />
        </Card>
      ) : totalRecords === 0 ? (
        <EmptyState
          title="Keine Kits vorhanden"
          message="Erstellen Sie Ihr erstes Equipment-Kit, um mehrere Assets zusammenzufassen."
          icon={<IconBoxMultiple size={48} stroke={1.5} />}
          action={
            onCreateClick ? (
              <Button leftSection={<IconPlus size={16} />} onClick={onCreateClick}>
                Create Kit
              </Button>
            ) : null
          }
        />
      ) : (
        <Card withBorder>
          <DataViewTable<Kit>
            records={paginatedKits}
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
            onRowClick={({ record }) => handleKitRowClick(record)}
            highlightOnHover
            rowStyle={() => ({ cursor: 'pointer' })}
            paginationText={({ from, to, totalRecords: total }) =>
              `Showing ${from} to ${to} of ${total} kits`
            }
            noRecordsText={hasActiveFilters ? 'No kits match your filters' : 'No kits found'}
          />
        </Card>
      )}
    </DataViewLayout>
  );
}

