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
  onEdit?: (category: AssetType) => void;
  headerActions?: ReactNode;
}

type AssetTypeViewFilters = {
  search?: string;
};

function getActiveCategoryFilterCount(filters: AssetTypeViewFilters): number {
  return filters.search ? 1 : 0;
}

function getColumns(
  onEdit: AssetTypeListProps['onEdit'],
  onDuplicate: (category: AssetType) => void,
  onDelete: (category: AssetType) => void,
  duplicatePending: boolean,
  deletePending: boolean,
): DataTableColumn<AssetType>[] {
  return [
    {
      accessor: 'icon',
      title: '',
      width: 60,
      render: (category) => (
        <Box ta="center">
          <IconDisplay iconName={category.icon} size={24} />
        </Box>
      ),
    },
    {
      accessor: 'name',
      title: 'Name',
      sortable: true,
      render: (category) => (
        <Box>
          <Text fw={500}>{category.name}</Text>
          <Text size="xs" c="dimmed">
            Created {new Date(category.createdAt).toLocaleDateString()}
          </Text>
        </Box>
      ),
    },
    {
      accessor: 'customFields',
      title: 'Custom Fields',
      sortable: true,
      render: (category) => (
        <Group gap="xs">
          <Text size="sm">{category.customFields.length}</Text>
          <Text size="xs" c="dimmed">
            {category.customFields.length === 1 ? 'field' : 'fields'}
          </Text>
        </Group>
      ),
    },
    {
      accessor: 'lastModifiedBy',
      title: 'Last Modified',
      render: (category) => (
        <Box>
          <Text size="sm">{category.lastModifiedByName}</Text>
          <Text size="xs" c="dimmed">
            {new Date(category.lastModifiedAt).toLocaleDateString()}
          </Text>
        </Box>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      width: 60,
      render: (category) => (
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
                    onEdit(category);
                  }}
                >
                  Edit
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={<IconCopy size={14} />}
                onClick={(event) => {
                  event.stopPropagation();
                  void onDuplicate(category);
                }}
                disabled={duplicatePending}
              >
                Duplicate
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={(event) => {
                  event.stopPropagation();
                  void onDelete(category);
                }}
                disabled={deletePending}
              >
                Delete
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
  const { data: categories = [], isLoading, error } = useCategories();
  const deleteAssetType = useDeleteCategory();
  const duplicateCategory = useDuplicateCategory();

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
    storageKey: 'category-data-view',
    defaultMode: 'table',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50],
    pageSizeStorageKey: 'category-list-page-size',
    initialFilters: {},
    getActiveFilterCount: getActiveCategoryFilterCount,
    initialSort: {
      columnAccessor: 'name',
      direction: 'asc',
    },
  });

  const filteredCategories = useMemo(() => {
    const query = filters.search?.trim().toLowerCase();
    if (!query) {
      return categories;
    }

    return categories.filter((category) => {
      if (category.name.toLowerCase().includes(query)) {
        return true;
      }

      return category.customFields.some((field) => field.name.toLowerCase().includes(query));
    });
  }, [categories, filters.search]);

  const sortedCategories = useMemo(() => {
    if (!sortStatus) {
      return filteredCategories;
    }

    const { columnAccessor, direction } = sortStatus;
    const sorted = [...filteredCategories];

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
  }, [filteredCategories, sortStatus]);

  const totalRecords = sortedCategories.length;

  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedCategories.slice(start, end);
  }, [sortedCategories, page, pageSize]);

  const handleToggleFilters = () => {
    setFiltersOpen((prev) => !prev);
  };

  const handleDelete = useCallback(async (category: AssetType) => {
    if (!window.confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteAssetType.mutateAsync(category.id);
      notifications.show({
        title: 'Success',
        message: `Category "${category.name}" has been deleted`,
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete category',
        color: 'red',
      });
    }
  }, [deleteAssetType]);

  const handleDuplicate = useCallback(async (category: AssetType) => {
    try {
      const duplicated = await duplicateCategory.mutateAsync({
        id: category.id,
        name: category.name,
        icon: category.icon,
        customFields: category.customFields,
      });

      notifications.show({
        title: 'Success',
        message: `Category "${duplicated.name}" has been created`,
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to duplicate category',
        color: 'red',
      });
    }
  }, [duplicateCategory]);

  const columns = useMemo(
    () =>
      getColumns(
        onEdit,
        handleDuplicate,
        handleDelete,
        duplicateCategory.isPending,
        deleteAssetType.isPending,
      ),
    [onEdit, handleDuplicate, handleDelete, duplicateCategory.isPending, deleteAssetType.isPending],
  );

  const filterContent = (
    <Stack gap="md">
      <Group align="flex-end" justify="space-between" wrap="wrap">
        <TextInput
          label="Search"
          placeholder="Search categories"
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
              Clear filters
            </Button>
          </Group>
        )}
      </Group>
    </Stack>
  );

  if (error) {
    return (
      <Card withBorder>
        <Text c="red">Error loading categories: {error.message}</Text>
      </Card>
    );
  }

  return (
    <DataViewLayout
      title="Asset Categories"
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
          records={paginatedCategories}
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
            `Showing ${from} to ${to} of ${total} categories`
          }
          noRecordsText={
            hasActiveFilters ? 'No categories match your filters' : 'No categories found'
          }
        />
      </Card>
    </DataViewLayout>
  );
}
