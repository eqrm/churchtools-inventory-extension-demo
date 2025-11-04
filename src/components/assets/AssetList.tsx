 
import { useState, useMemo, memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import type { DataTableSortStatus } from 'mantine-datatable';
import {
  IconDots,
  IconEdit,
  IconEye,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useAssets, useDeleteAsset, useCreateAsset } from '../../hooks/useAssets';
import { useCategories } from '../../hooks/useCategories';
import { useAssetPrefixes } from '../../hooks/useAssetPrefixes';
import { useUndoStore } from '../../stores/undoStore';
import { useMaintenanceSchedules } from '../../hooks/useMaintenance';
import { notifications } from '@mantine/notifications';
import { AssetStatusBadge } from './AssetStatusBadge';
import { CustomFieldFilterInput } from './CustomFieldFilterInput';
import { IconDisplay } from '../categories/IconDisplay';
import { MaintenanceReminderBadge } from '../maintenance/MaintenanceReminderBadge';
import type { Asset, AssetStatus, AssetFilters } from '../../types/entities';
import { ASSET_STATUS_OPTIONS } from '../../constants/assetStatuses';
import { DataViewLayout } from '../dataView/DataViewLayout';
import { DataViewTable } from '../dataView/DataViewTable';
import { useDataViewState } from '../../hooks/useDataViewState';

interface AssetListProps {
  onView?: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  onCreateNew?: () => void;
  initialFilters?: AssetFilters;
  filtersOpen?: boolean;
  onToggleFilters?: () => void;
  hideFilterButton?: boolean;
}

const ASSET_TYPE_OPTIONS = [
  { value: 'all', label: 'All Assets' },
  { value: 'parent', label: 'Parent Assets Only' },
  { value: 'child', label: 'Child Assets Only' },
  { value: 'standalone', label: 'Standalone Assets Only' },
];

const ASSET_PAGE_SIZE_OPTIONS: number[] = [25, 50, 100, 200];
const ASSET_PAGE_SIZE_STORAGE_KEY = 'asset-list-page-size';
const DEFAULT_ASSET_PAGE_SIZE = 50;

type AssetTypeFilter = 'parent' | 'child' | 'standalone';

interface AssetViewFilters extends AssetFilters {
  assetType?: AssetTypeFilter;
  prefixId?: string;
}

function getActiveAssetFilterCount(filters: AssetViewFilters): number {
  let count = 0;

  if (filters.search) count += 1;
  if (filters.categoryId) count += 1;
  if (filters.status) count += 1;
  if (filters.location) count += 1;
  if (filters.parentAssetId) count += 1;
  if (typeof filters.isParent === 'boolean') count += 1;
  if (filters.assetType) count += 1;
  if (filters.prefixId) count += 1;

  if (filters.customFields) {
    count += Object.values(filters.customFields).filter((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== '';
    }).length;
  }

  return count;
}

interface AssetListRow extends Asset {
  __depth: number;
  __parentId?: string;
  __hasVisibleChildren: boolean;
  __isExpanded?: boolean;
}

export function AssetList({
  onView,
  onEdit,
  onCreateNew,
  initialFilters,
  filtersOpen,
  onToggleFilters,
  hideFilterButton,
}: AssetListProps) {
  const navigate = useNavigate(); // T263 - E4: Router navigation for direct clicks
  const [internalFiltersOpen, setInternalFiltersOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const filtersPanelOpen = filtersOpen ?? internalFiltersOpen;
  const toggleFilters = () => {
    if (onToggleFilters) {
      onToggleFilters();
      return;
    }
    setInternalFiltersOpen((prev) => !prev);
  };

  const initialFiltersSnapshot = useMemo(
    () => JSON.stringify(initialFilters ?? {}),
    [initialFilters],
  );

  const initialViewFilters = useMemo<AssetViewFilters>(() => {
    if (!initialFilters) {
      return {} as AssetViewFilters;
    }

    const base: AssetViewFilters = {
      ...initialFilters,
      customFields: initialFilters.customFields ? { ...initialFilters.customFields } : undefined,
    } as AssetViewFilters;

    return base;
  }, [initialFilters]);

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
  } = useDataViewState<AssetViewFilters, DataTableSortStatus<AssetListRow>>({
    storageKey: 'asset-data-view',
    initialFilters: initialViewFilters,
    initialFiltersKey: initialFiltersSnapshot,
    defaultMode: 'table',
    initialSort: {
      columnAccessor: 'assetNumber',
      direction: 'asc',
    } satisfies DataTableSortStatus<AssetListRow>,
    defaultPageSize: DEFAULT_ASSET_PAGE_SIZE,
    pageSizeOptions: ASSET_PAGE_SIZE_OPTIONS,
    pageSizeStorageKey: ASSET_PAGE_SIZE_STORAGE_KEY,
    getActiveFilterCount: getActiveAssetFilterCount,
  });


  const { data: categories = [] } = useCategories();
  const { data: prefixes = [] } = useAssetPrefixes(); // T275: Load prefixes for filtering
  const assetFilters = useMemo<AssetFilters>(() => {
    const { assetType: _assetType, prefixId: _prefixId, ...rest } = filters;
    const next: AssetFilters = { ...rest };
    if (rest.customFields) {
      next.customFields = { ...rest.customFields };
    }
    return next;
  }, [filters]);

  const { data: assets = [], isLoading, error } = useAssets(assetFilters);
  const { data: maintenanceSchedules = [] } = useMaintenanceSchedules();
  const deleteAsset = useDeleteAsset();
  const createAsset = useCreateAsset();
  const addUndoAction = useUndoStore((state) => state.addAction);
  const getUndoAction = useUndoStore((state) => state.getAction);
  const removeUndoAction = useUndoStore((state) => state.removeAction);

  useEffect(() => {
    setExpandedParents((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;

      assets
        .filter((asset) => asset.isParent && (asset.childAssetIds?.length ?? 0) > 0)
        .forEach((asset) => {
          const existing = prev[asset.id];
          next[asset.id] = existing ?? true;
          if (existing === undefined) {
            changed = true;
          }
        });

      if (Object.keys(prev).length !== Object.keys(next).length) {
        changed = true;
      }

      if (!changed) {
        return prev;
      }

      return next;
    });
  }, [assets]);

  // T263 - E4: Handle row click for direct navigation
  const handleRowClick = (params: { record: Asset; index: number; event: React.MouseEvent }) => {
    const asset = params.record;
    
    // If onView callback provided, use it (for modal/drawer behavior)
    if (onView) {
      onView(asset);
    } else {
      // Otherwise, navigate to asset detail page
      navigate(`/assets/${asset.id}`);
    }
  };

  // Filter assets by type (parent/child/standalone) - T099
  // T275: Also filter by prefix
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (filters.assetType === 'parent' && !asset.isParent) return false;
      if (filters.assetType === 'child' && !asset.parentAssetId) return false;
      if (filters.assetType === 'standalone' && (asset.isParent || asset.parentAssetId)) return false;

      if (filters.prefixId) {
        const selectedPrefix = prefixes.find(prefix => prefix.id === filters.prefixId);
        if (selectedPrefix && !asset.assetNumber.startsWith(`${selectedPrefix.prefix}-`)) {
          return false;
        }
      }

      return true;
    });
  }, [assets, filters.assetType, filters.prefixId, prefixes]);

  // Sort assets (memoized to avoid re-sorting on every render) - T217
  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      const { columnAccessor, direction } = sortStatus;
      
      let aValue: string | number = '';
      let bValue: string | number = '';
      
      if (columnAccessor === 'assetNumber') {
        aValue = a.assetNumber;
        bValue = b.assetNumber;
      } else if (columnAccessor === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (columnAccessor === 'category') {
        aValue = a.category.name;
        bValue = b.category.name;
      } else if (columnAccessor === 'status') {
        aValue = a.status;
        bValue = b.status;
      } else if (columnAccessor === 'location') {
        aValue = a.location || '';
        bValue = b.location || '';
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
  }, [filteredAssets, sortStatus]);

  const visibleChildrenMap = useMemo(() => {
    const map: Record<string, Asset[]> = {};
    for (const asset of sortedAssets) {
      const parentId = asset.parentAssetId;
      if (!parentId) continue;
      if (!map[parentId]) {
        map[parentId] = [];
      }
      map[parentId].push(asset);
    }
    return map;
  }, [sortedAssets]);

  const assetIdSet = useMemo(() => new Set(sortedAssets.map(asset => asset.id)), [sortedAssets]);

  const topLevelAssets = useMemo(() => {
    return sortedAssets.filter(asset => {
      if (!asset.parentAssetId) return true;
      return !assetIdSet.has(asset.parentAssetId);
    });
  }, [sortedAssets, assetIdSet]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(topLevelAssets.length / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, pageSize, topLevelAssets.length, setPage]);

  const paginatedTopLevelAssets = useMemo(() => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    return topLevelAssets.slice(from, to);
  }, [topLevelAssets, page, pageSize]);

  const displayRecords = useMemo<AssetListRow[]>(() => {
    const rows: AssetListRow[] = [];

    const appendAsset = (asset: Asset, depth: number) => {
      const children = visibleChildrenMap[asset.id] ?? [];
      const hasVisibleChildren = children.length > 0;
      const isExpanded = hasVisibleChildren ? (expandedParents[asset.id] ?? true) : undefined;

      rows.push({
        ...asset,
        __depth: depth,
        __parentId: asset.parentAssetId,
        __hasVisibleChildren: hasVisibleChildren,
        __isExpanded: isExpanded,
      });

      if (hasVisibleChildren && isExpanded) {
        children.forEach(child => appendAsset(child, depth + 1));
      }
    };

    paginatedTopLevelAssets.forEach(asset => {
      const initialDepth = asset.parentAssetId ? 1 : 0;
      appendAsset(asset, initialDepth);
    });

    return rows;
  }, [expandedParents, paginatedTopLevelAssets, visibleChildrenMap]);

  const handleDelete = async (asset: Asset) => {
    // T102: Parent deletion validation
    if (asset.isParent && asset.childAssetIds && asset.childAssetIds.length > 0) {
      notifications.show({
        title: 'Cannot Delete Parent Asset',
        message: `This parent asset has ${asset.childAssetIds.length} child assets. Please delete or reassign children first.`,
        color: 'red',
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${asset.name}" (${asset.assetNumber})?`)) {
      return;
    }

    try {
      // T225: Store asset for undo before deletion
      const deletedAsset = { ...asset };
      
      await deleteAsset.mutateAsync(asset.id);
      
      // T225: Add undo action to queue
      const undoId = addUndoAction({
        type: 'delete-asset',
        data: deletedAsset,
        label: `${deletedAsset.name} (${deletedAsset.assetNumber})`,
      });
      
      // T225: Show notification with undo button
      // Note: Mantine notifications don't support action buttons directly
      // Using message with instructions instead
      notifications.show({
        id: undoId,
        title: 'Asset Deleted',
        message: `"${deletedAsset.name}" has been deleted. Click to undo within 10 seconds.`,
        color: 'green',
        autoClose: 10000,
        withCloseButton: true,
        onClick: async () => {
          // Get the action from store
          const action = getUndoAction(undoId);
          if (!action) return;
          
          try {
            // Restore the asset
            await createAsset.mutateAsync(action.data as Asset);
            
            // Remove from undo queue
            removeUndoAction(undoId);
            
            // Close the notification
            notifications.hide(undoId);
            
            // Show success
            notifications.show({
              title: 'Asset Restored',
              message: `"${deletedAsset.name}" has been restored`,
              color: 'blue',
            });
          } catch (err) {
            notifications.show({
              title: 'Restore Failed',
              message: err instanceof Error ? err.message : 'Failed to restore asset',
              color: 'red',
            });
          }
        },
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete asset',
        color: 'red',
      });
    }
  };

  const clearFilters = () => {
    resetFilters();
  };

  const filterContent = (
    <Stack gap="md">
      <Group align="flex-end">
        <TextInput
          label="Search"
          placeholder="Search by name, asset number, or description"
          leftSection={<IconSearch size={16} />}
          value={filters.search ?? ''}
          onChange={(e) => {
            const nextValue = e.currentTarget.value;
            setFilters((prev) => ({
              ...prev,
              search: nextValue,
            }));
          }}
          style={{ flex: 1 }}
        />
        {hasActiveFilters && (
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconX size={16} />}
            onClick={clearFilters}
          >
            Clear All
          </Button>
        )}
      </Group>

      <Group grow>
        <Select
          label="Asset Type"
          value={filters.assetType ?? 'all'}
          onChange={(val) => {
            setFilters((prev) => ({
              ...prev,
              assetType: val && val !== 'all' ? (val as AssetTypeFilter) : undefined,
            }));
          }}
          data={ASSET_TYPE_OPTIONS}
        />

        {prefixes.length > 0 && (
          <Select
            label="Asset Prefix"
            placeholder="All prefixes"
            value={filters.prefixId ?? null}
            onChange={(val) => {
              setFilters((prev) => ({
                ...prev,
                prefixId: val ?? undefined,
              }));
            }}
            data={prefixes.map((prefix) => ({
              value: prefix.id,
              label: `${prefix.prefix} - ${prefix.description}`,
            }))}
            clearable
          />
        )}

        <Select
          label="Category"
          placeholder="All categories"
          value={filters.categoryId ?? null}
          onChange={(val) => {
            setFilters((prev) => ({
              ...prev,
              categoryId: val ?? undefined,
              customFields:
                val && val === prev.categoryId ? prev.customFields : undefined,
            }));
          }}
          data={categories.map((cat) => ({
            value: cat.id,
            label: `${cat.icon || ''} ${cat.name}`.trim(),
          }))}
          clearable
        />

        <Select
          label="Status"
          placeholder="All statuses"
          value={(filters.status as string | undefined) ?? null}
          onChange={(val) => {
            setFilters((prev) => ({
              ...prev,
              status: val ? (val as AssetStatus) : undefined,
            }));
          }}
          data={ASSET_STATUS_OPTIONS}
          clearable
        />

        <TextInput
          label="Location"
          placeholder="Filter by location"
          value={filters.location ?? ''}
          onChange={(e) => {
            const nextValue = e.currentTarget.value;
            setFilters((prev) => ({
              ...prev,
              location: nextValue ? nextValue : undefined,
            }));
          }}
        />
      </Group>

      {filters.categoryId && (() => {
        const selectedCategory = categories.find((category) => category.id === filters.categoryId);
        if (selectedCategory && selectedCategory.customFields.length > 0) {
          return (
            <>
              <Text size="sm" fw={600} mt="md">
                Custom Field Filters
              </Text>
              <Group grow>
                {selectedCategory.customFields.map((field) => (
                  <CustomFieldFilterInput
                    key={field.id}
                    field={field}
                    value={filters.customFields?.[field.id]}
                    onChange={(value) => {
                      setFilters((prev) => {
                        const currentCustomFields = { ...(prev.customFields ?? {}) };

                        let nextCustomFields: Record<string, unknown> | undefined;
                        if (value === undefined) {
                          const { [field.id]: _removed, ...remaining } = currentCustomFields;
                          nextCustomFields = Object.keys(remaining).length > 0 ? remaining : undefined;
                        } else {
                          nextCustomFields = {
                            ...currentCustomFields,
                            [field.id]: value,
                          };
                        }

                        return {
                          ...prev,
                          customFields: nextCustomFields,
                        };
                      });
                    }}
                  />
                ))}
              </Group>
            </>
          );
        }
        return null;
      })()}
    </Stack>
  );

  if (error) {
    return (
      <Card withBorder>
        <Text c="red">Error loading assets: {error.message}</Text>
      </Card>
    );
  }

  const primaryAction = onCreateNew
    ? {
        label: 'New Asset',
        icon: <IconPlus size={16} />,
        onClick: onCreateNew,
      }
    : undefined;

  return (
    <DataViewLayout
      title="Assets"
      mode={viewMode}
      availableModes={['table']}
      onModeChange={setViewMode}
      filtersOpen={filtersPanelOpen}
      onToggleFilters={toggleFilters}
      hasActiveFilters={hasActiveFilters}
      activeFilterCount={activeFilterCount}
      primaryAction={primaryAction}
      showFilterButton={hideFilterButton !== true}
      filterContent={filterContent}
    >
      <Card withBorder>
        <DataViewTable<AssetListRow>
          records={displayRecords}
          onRowClick={handleRowClick}
          rowStyle={() => ({ cursor: 'pointer' })}
          totalRecords={topLevelAssets.length}
          recordsPerPage={pageSize}
          recordsPerPageOptions={pageSizeOptions}
          page={page}
          onPageChange={setPage}
          onRecordsPerPageChange={(size: number) => {
            setPageSize(size);
            setPage(1);
          }}
          paginationText={({ from, to, totalRecords }: { from: number; to: number; totalRecords: number }) =>
            `Showing ${from} to ${to} of ${totalRecords} assets`
          }
          columns={[
            {
              accessor: '__expander',
              title: '',
              width: 90,
              render: (asset) => {
                const childCount = asset.childAssetIds?.length ?? 0;
                const isExpanded = asset.__isExpanded ?? false;
                const isParent = asset.isParent;

                return (
                  <Group gap="xs">
                    {asset.__hasVisibleChildren ? (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        aria-label={isExpanded ? 'Collapse sub assets' : 'Expand sub assets'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedParents((prev) => ({
                            ...prev,
                            [asset.id]: !(prev[asset.id] ?? true),
                          }));
                        }}
                      >
                        <Box
                          component="span"
                          style={{
                            display: 'inline-block',
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 150ms ease',
                            fontWeight: 600,
                            fontSize: 14,
                            lineHeight: 1,
                          }}
                        >
                          {'>'}
                        </Box>
                      </ActionIcon>
                    ) : (
                      <Box w={28} />
                    )}
                    {isParent && (
                      <Badge size="sm" circle variant="filled" color="blue">
                        {childCount}
                      </Badge>
                    )}
                  </Group>
                );
              },
            },
            {
              accessor: 'assetNumber',
              title: 'Asset #',
              sortable: true,
              width: 140,
              render: (asset) => (
                <Text
                  fw={600}
                  size="sm"
                  style={{ paddingLeft: `${asset.__depth * 16}px` }}
                >
                  {asset.assetNumber}
                </Text>
              ),
            },
            {
              accessor: 'name',
              title: 'Name',
              sortable: true,
              render: (asset) => (
                <Box style={{ marginLeft: `${asset.__depth * 16}px` }}>
                  <Text fw={500}>{asset.name}</Text>
                  {asset.description && (
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {asset.description}
                    </Text>
                  )}
                </Box>
              ),
            },
            {
              accessor: 'category',
              title: 'Category',
              sortable: true,
              render: (asset) => {
                const icon = asset.category.icon;
                return (
                  <Badge
                    variant="light"
                    color="blue"
                    leftSection={icon ? <IconDisplay iconName={icon} size={14} /> : undefined}
                  >
                    {asset.category.name}
                  </Badge>
                );
              },
            },
            {
              accessor: 'status',
              title: 'Status',
              sortable: true,
              render: (asset) => <AssetStatusBadge status={asset.status} />,
            },
            {
              accessor: 'location',
              title: 'Location',
              sortable: true,
              render: (asset) => (
                <Text size="sm" c={asset.location ? undefined : 'dimmed'}>
                  {asset.location || '—'}
                </Text>
              ),
            },
            {
              accessor: 'manufacturer',
              title: 'Manufacturer',
              render: (asset) => (
                <Box>
                  <Text size="sm" c={asset.manufacturer ? undefined : 'dimmed'}>
                    {asset.manufacturer || '—'}
                  </Text>
                  {asset.model && (
                    <Text size="xs" c="dimmed">
                      {asset.model}
                    </Text>
                  )}
                </Box>
              ),
            },
            {
              accessor: 'maintenance',
              title: 'Maintenance',
              width: 120,
              render: (asset) => {
                const schedule = maintenanceSchedules.find((s) => s.assetId === asset.id);
                return schedule ? <MaintenanceReminderBadge schedule={schedule} /> : null;
              },
            },
            {
              accessor: 'actions',
              title: '',
              width: 60,
              render: (asset) => (
                <Group gap={0} justify="flex-end">
                  <Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      {onView && (
                        <Menu.Item
                          leftSection={<IconEye size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onView(asset);
                          }}
                        >
                          View Details
                        </Menu.Item>
                      )}
                      {onEdit && (
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(asset);
                          }}
                        >
                          Edit
                        </Menu.Item>
                      )}
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(asset);
                        }}
                        disabled={deleteAsset.isPending}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              ),
            },
          ]}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          fetching={isLoading}
          minHeight={150}
          noRecordsText={hasActiveFilters ? 'No assets match your filters' : 'No assets found'}
        />
      </Card>
    </DataViewLayout>
  );
}

/**
 * Memoized AssetList component to prevent unnecessary re-renders (T216)
 * Only re-renders when props actually change
 */
export const AssetListMemo = memo(AssetList);
