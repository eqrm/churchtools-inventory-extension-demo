import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCopy,
  IconDots,
  IconEdit,
  IconFilter,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import type { DataTableColumn, DataTableSortStatus } from 'mantine-datatable';
import { DataViewLayout } from '../dataView/DataViewLayout';
import { DataViewTable } from '../dataView/DataViewTable';
import { useDataViewState } from '../../hooks/useDataViewState';
import { useCategories, useDeleteCategory, useDuplicateCategory } from '../../hooks/useCategories';
import type { AssetType } from '../../types/entities';
import { IconDisplay } from './IconDisplay';

interface AssetTypeListProps {
  onEdit?: (assetType: AssetType) => void;
  headerActions?: ReactNode;
}

interface AssetTypeViewFilters extends Record<string, unknown> {
  search?: string;
}

function getActiveFilterCount(filters: AssetTypeViewFilters): number {
  return filters.search ? 1 : 0;
}

function getColumns(
  onEdit: AssetTypeListProps['onEdit'],
  onDuplicate: (assetType: AssetType) => void,
  onDelete: (assetType: AssetType) => void,
  duplicatePending: boolean,
  deletePending: boolean,
): DataTableColumn<AssetType>[] {
  return [
    {
      accessor: 'icon',
      title: '',
      width: 60,
      render: (assetType) => (
        <Box ta="center">
          <IconDisplay iconName={assetType.icon} size={24} />
        </Box>
      ),
    },
    {
      accessor: 'name',
      title: 'Name',
      sortable: true,
      render: (assetType) => (
        <Box>
          <Text fw={500}>{assetType.name}</Text>
          <Text size="xs" c="dimmed">
            Erstellt am {new Date(assetType.createdAt).toLocaleDateString()}
          </Text>
        </Box>
      ),
    },
    {
      accessor: 'customFields',
      title: 'Eigene Felder',
      sortable: true,
      render: (assetType) => (
        <Group gap="xs">
          <Text size="sm">{assetType.customFields.length}</Text>
          <Text size="xs" c="dimmed">
            {assetType.customFields.length === 1 ? 'Feld' : 'Felder'}
          </Text>
        </Group>
      ),
    },
    {
      accessor: 'lastModifiedBy',
      title: 'Zuletzt geändert',
      render: (assetType) => (
        <Box>
          <Text size="sm">{assetType.lastModifiedByName}</Text>
          <Text size="xs" c="dimmed">
            {new Date(assetType.lastModifiedAt).toLocaleDateString()}
          </Text>
        </Box>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      width: 60,
      render: (assetType) => (
        <Group gap={0} justify="flex-end">
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={(event) => event.stopPropagation()}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              {onEdit && (
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(assetType);
                  }}
                >
                  Bearbeiten
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={<IconCopy size={14} />}
                onClick={(event) => {
                  event.stopPropagation();
                  void onDuplicate(assetType);
                }}
                disabled={duplicatePending}
              >
                Duplizieren
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={(event) => {
                  event.stopPropagation();
                  void onDelete(assetType);
                }}
                disabled={deletePending}
              >
                Löschen
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      ),
    },
  ];
}

export function AssetTypeList({ onEdit, headerActions }: AssetTypeListProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const { data: assetTypes = [], isLoading, error } = useCategories();
  const deleteAssetType = useDeleteCategory();
  const duplicateAssetType = useDuplicateCategory();

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
  } = useDataViewState<AssetTypeViewFilters, DataTableSortStatus<AssetType>>({
    storageKey: 'asset-type-data-view',
    defaultMode: 'table',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50],
    pageSizeStorageKey: 'asset-type-list-page-size',
    initialFilters: {},
    getActiveFilterCount,
    initialSort: {
      columnAccessor: 'name',
      direction: 'asc',
    },
  });

  const filteredAssetTypes = useMemo(() => {
    const query = filters.search?.trim().toLowerCase();
    if (!query) {
      return assetTypes;
    }

    return assetTypes.filter((assetType) => {
      if (assetType.name.toLowerCase().includes(query)) {
        return true;
      }

      return assetType.customFields.some((field) => field.name.toLowerCase().includes(query));
    });
  }, [assetTypes, filters.search]);

  const sortedAssetTypes = useMemo(() => {
    if (!sortStatus) {
      return filteredAssetTypes;
    }

    const { columnAccessor, direction } = sortStatus;
    const sorted = [...filteredAssetTypes];

    sorted.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (columnAccessor) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'customFields':
          aValue = a.customFields.length;
          bValue = b.customFields.length;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'lastModifiedBy':
          aValue = new Date(a.lastModifiedAt).getTime();
          bValue = new Date(b.lastModifiedAt).getTime();
          break;
        default:
          break;
      }

      if (aValue === bValue) {
        return 0;
      }

      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      }

      return aValue < bValue ? 1 : -1;
    });

    return sorted;
  }, [filteredAssetTypes, sortStatus]);

  const totalRecords = sortedAssetTypes.length;

  const paginatedAssetTypes = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedAssetTypes.slice(start, end);
  }, [sortedAssetTypes, page, pageSize]);

  const handleToggleFilters = () => {
    setFiltersOpen((prev) => !prev);
  };

  const handleDelete = useCallback(async (assetType: AssetType) => {
    if (!window.confirm(`Soll der Asset-Typ "${assetType.name}" wirklich gelöscht werden?`)) {
      return;
    }

    try {
      await deleteAssetType.mutateAsync(assetType.id);
      notifications.show({
        title: 'Erfolgreich',
        message: `Asset-Typ "${assetType.name}" wurde gelöscht`,
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Fehler',
        message: err instanceof Error ? err.message : 'Asset-Typ konnte nicht gelöscht werden',
        color: 'red',
      });
    }
  }, [deleteAssetType]);

  const handleDuplicate = useCallback(async (assetType: AssetType) => {
    try {
      const duplicated = await duplicateAssetType.mutateAsync({
        id: assetType.id,
        name: assetType.name,
        icon: assetType.icon,
        customFields: assetType.customFields,
      });

      notifications.show({
        title: 'Erfolgreich',
        message: `Asset-Typ "${duplicated.name}" wurde erstellt`,
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Fehler',
        message: err instanceof Error ? err.message : 'Asset-Typ konnte nicht dupliziert werden',
        color: 'red',
      });
    }
  }, [duplicateAssetType]);

  const columns = useMemo(
    () =>
      getColumns(
        onEdit,
        handleDuplicate,
        handleDelete,
        duplicateAssetType.isPending,
        deleteAssetType.isPending,
      ),
    [onEdit, handleDuplicate, handleDelete, duplicateAssetType.isPending, deleteAssetType.isPending],
  );

  const filterContent = (
    <Stack gap="md">
      <Group align="flex-end" justify="space-between" wrap="wrap">
        <TextInput
          label="Suche"
          placeholder="Asset-Typen durchsuchen"
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

        {hasActiveFilters && (
          <Group gap="sm">
            <Button variant="subtle" leftSection={<IconFilter size={16} />} onClick={resetFilters}>
              Filter zurücksetzen
            </Button>
          </Group>
        )}
      </Group>
    </Stack>
  );

  if (error) {
    return (
      <Card withBorder>
        <Text c="red">Fehler beim Laden der Asset-Typen: {error.message}</Text>
      </Card>
    );
  }

  return (
    <DataViewLayout
      title="Asset-Typen"
      mode={viewMode}
      availableModes={['table']}
      onModeChange={setViewMode}
      filtersOpen={filtersOpen}
      onToggleFilters={handleToggleFilters}
      hasActiveFilters={hasActiveFilters}
      activeFilterCount={activeFilterCount}
      actions={headerActions}
      filterContent={filterContent}
    >
      <Card withBorder>
        <DataViewTable<AssetType>
          records={paginatedAssetTypes}
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
          onRowClick={({ record }) => {
            onEdit?.(record);
          }}
          rowStyle={() => ({ cursor: onEdit ? 'pointer' : 'default' })}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          fetching={isLoading}
          paginationText={({ from, to, totalRecords: total }) =>
            `Zeige ${from} bis ${to} von ${total} Asset-Typen`
          }
          noRecordsText={
            hasActiveFilters
              ? 'Keine Asset-Typen entsprechen den Filtern'
              : 'Noch keine Asset-Typen vorhanden'
          }
        />
      </Card>
    </DataViewLayout>
  );
}
