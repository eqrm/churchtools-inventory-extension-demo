 
import { useState, useMemo, memo, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
  SegmentedControl,
} from '@mantine/core';
import type { DataTableSortStatus } from 'mantine-datatable';
import {
  IconDots,
  IconEdit,
  IconEye,
  IconSearch,
  IconTrash,
  IconX,
  IconPackage,
} from '@tabler/icons-react';
import { useAssets, useDeleteAsset, useCreateAsset } from '../../hooks/useAssets';
import { useCategories } from '../../hooks/useCategories';
import { useAssetPrefixes } from '../../hooks/useAssetPrefixes';
import { useAssetGroups } from '../../hooks/useAssetGroups';
import { useMaintenanceSchedules } from '../../hooks/useMaintenance';
import { notifications } from '@mantine/notifications';
import { AssetStatusBadge } from './AssetStatusBadge';
import { CustomFieldFilterInput } from './CustomFieldFilterInput';
import { IconDisplay } from '../categories/IconDisplay';
import { MaintenanceReminderBadge } from '../maintenance/MaintenanceReminderBadge';
import type {
  Asset,
  AssetStatus,
  AssetFilters,
  AssetGroup,
  AssetCreate,
} from '../../types/entities';
import { ASSET_STATUS_OPTIONS } from '../../constants/assetStatuses';
import { DataViewLayout } from '../dataView/DataViewLayout';
import { DataViewTable } from '../dataView/DataViewTable';
import { useDataViewState } from '../../hooks/useDataViewState';
import { ViewSelector } from '../views/ViewSelector';
import { FilterBuilder } from '../views/FilterBuilder';
import { useUIStore } from '../../stores/uiStore';
import { applyFilters } from '../../utils/filterEvaluation';
import { countFilterConditions, createFilterGroup } from '../../utils/viewFilters';
import { AssetGalleryView } from './AssetGalleryView';
import { AssetKanbanView } from './AssetKanbanView';
import { AssetCalendarView } from './AssetCalendarView';

interface AssetListProps {
  onView?: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  initialFilters?: AssetFilters;
  filtersOpen?: boolean;
  onToggleFilters?: () => void;
  hideFilterButton?: boolean;
  hideViewSelector?: boolean;
  hideAdvancedFilters?: boolean;
}

const ASSET_TYPE_OPTIONS = [
  { value: 'all', label: 'All Assets' },
  { value: 'parent', label: 'Parent Assets Only' },
  { value: 'child', label: 'Child Assets Only' },
  { value: 'standalone', label: 'Standalone Assets Only' },
];

type LocalUndoEntry = {
  type: 'delete-asset';
  assetSnapshot: Asset;
  createPayload: AssetCreate;
  label: string;
};

const generateUndoId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const toAssetCreatePayload = (asset: Asset): AssetCreate => {
  const {
    id: _id,
    assetNumber,
    barcode: _barcode,
    qrCode: _qrCode,
    createdBy: _createdBy,
    createdByName: _createdByName,
    createdAt: _createdAt,
    lastModifiedBy: _lastModifiedBy,
    lastModifiedByName: _lastModifiedByName,
    lastModifiedAt: _lastModifiedAt,
    isAvailable: _isAvailable,
    currentBooking: _currentBooking,
    nextMaintenance: _nextMaintenance,
    ...rest
  } = asset;

  return {
    ...rest,
    assetNumber,
  };
};

const GROUP_MEMBERSHIP_OPTIONS = [
  { value: 'all', label: 'All Assets' },
  { value: 'grouped', label: 'Grouped Assets' },
  { value: 'ungrouped', label: 'Without Group' },
];

const ASSET_PAGE_SIZE_OPTIONS: number[] = [25, 50, 100, 200];
const ASSET_PAGE_SIZE_STORAGE_KEY = 'asset-list-page-size';
const DEFAULT_ASSET_PAGE_SIZE = 50;
const GROUP_VIEW_STORAGE_KEY = 'asset-list-group-view-enabled';
const UNGROUPED_GROUP_ID = '__ungrouped__';

type AssetTypeFilter = 'parent' | 'child' | 'standalone';

type AssetViewFilters = (AssetFilters & {
  assetType?: AssetTypeFilter;
  prefixId?: string;
  hasAssetGroup?: boolean;
  assetGroupId?: string;
}) & Record<string, unknown>;

function getActiveAssetFilterCount(filters: AssetViewFilters): number {
  let count = 0;

  if (filters.search) count += 1;
  if (filters.assetTypeId) count += 1;
  if (filters.status) count += 1;
  if (filters.location) count += 1;
  if (filters.parentAssetId) count += 1;
  if (typeof filters.isParent === 'boolean') count += 1;
  if (filters.assetType) count += 1;
  if (filters.prefixId) count += 1;
  if (typeof filters.hasAssetGroup === 'boolean') count += 1;
  if (filters.assetGroupId) count += 1;

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

type AssetListAssetRow = Asset & {
  __kind: 'asset';
  __depth: number;
  __parentId?: string;
  __hasVisibleChildren: boolean;
  __isExpanded?: boolean;
  __groupId?: string | null;
};

interface AssetListGroupRow {
  __kind: 'group';
  id: string;
  assetNumber: string;
  groupNumber: string;
  name: string;
  memberCount: number;
  members: Asset[];
  assetType: Asset['assetType'] | null;
  manufacturer?: string;
  model?: string;
  inheritedFieldCount?: number;
  __depth: number;
  __isExpanded: boolean;
}

type AssetListRow = AssetListAssetRow | AssetListGroupRow;

const isGroupRow = (row: AssetListRow): row is AssetListGroupRow => row.__kind === 'group';
const isAssetRow = (row: AssetListRow): row is AssetListAssetRow => row.__kind === 'asset';

type AssetListSortStatus = DataTableSortStatus<AssetListRow> & DataTableSortStatus<unknown>;

export function AssetList({
  onView,
  onEdit,
  initialFilters,
  filtersOpen,
  onToggleFilters,
  hideFilterButton,
  hideViewSelector = false,
  hideAdvancedFilters = false,
}: AssetListProps) {
  const navigate = useNavigate(); // T263 - E4: Router navigation for direct clicks
  const [internalFiltersOpen, setInternalFiltersOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [groupViewEnabled, setGroupViewEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(GROUP_VIEW_STORAGE_KEY);
      return stored ? JSON.parse(stored) === true : false;
    } catch {
      return false;
    }
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroupExpansion = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !(prev[groupId] ?? true),
    }));
  }, []);

  const filtersPanelOpen = filtersOpen ?? internalFiltersOpen;
  const toggleFilters = () => {
    if (onToggleFilters) {
      onToggleFilters();
      return;
    }
    setInternalFiltersOpen((prev) => !prev);
  };

  const { viewMode, setViewMode, viewFilters, setViewFilters } = useUIStore((state) => ({
    viewMode: state.viewMode,
    setViewMode: state.setViewMode,
    viewFilters: state.viewFilters,
    setViewFilters: state.setViewFilters,
  }));


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
  } = useDataViewState<AssetViewFilters, AssetListSortStatus>({
    storageKey: 'asset-data-view',
    initialFilters: initialViewFilters,
    initialFiltersKey: initialFiltersSnapshot,
    defaultMode: 'table',
    initialSort: {
      columnAccessor: 'assetNumber',
      direction: 'asc',
    } satisfies AssetListSortStatus,
    defaultPageSize: DEFAULT_ASSET_PAGE_SIZE,
    pageSizeOptions: ASSET_PAGE_SIZE_OPTIONS,
    pageSizeStorageKey: ASSET_PAGE_SIZE_STORAGE_KEY,
    getActiveFilterCount: getActiveAssetFilterCount,
  });


  const { data: assetTypes = [] } = useCategories();
  const { data: prefixes = [] } = useAssetPrefixes(); // T275: Load prefixes for filtering
  const assetFilters = useMemo<AssetFilters>(() => {
    const { assetType: _assetType, prefixId: _prefixId, ...rest } = filters;
    const next: AssetFilters = { ...rest };
    if (rest.customFields) {
      next.customFields = { ...rest.customFields };
    }
    return next;
  }, [filters]);

  const advancedFilterCount = countFilterConditions(viewFilters);
  const hasAdvancedFilters = advancedFilterCount > 0;
  const combinedFilterCount = activeFilterCount + advancedFilterCount;
  const combinedHasFilters = hasActiveFilters || hasAdvancedFilters;

  const {
    data: assets = [],
    isLoading,
    error,
  } = useAssets(assetFilters);
  const { data: maintenanceSchedules = [] } = useMaintenanceSchedules();
  const { data: assetGroups = [], isLoading: loadingAssetGroups } = useAssetGroups();
  const deleteAsset = useDeleteAsset();
  const createAsset = useCreateAsset();
  const undoEntriesRef = useRef<Map<string, LocalUndoEntry>>(new Map());

  const addUndoAction = useCallback((entry: LocalUndoEntry) => {
    const id = generateUndoId();
    undoEntriesRef.current.set(id, entry);
    return id;
  }, []);

  const getUndoAction = useCallback((id: string) => {
    return undoEntriesRef.current.get(id);
  }, []);

  const removeUndoAction = useCallback((id: string) => {
    undoEntriesRef.current.delete(id);
  }, []);

  const groupMetadataById = useMemo(() => {
    const map = new Map<string, AssetGroup>();
    assetGroups.forEach((group) => {
      map.set(group.id, group);
    });
    return map;
  }, [assetGroups]);

  const groupOptions = useMemo(
    () =>
      assetGroups.map((group) => ({
        value: group.id,
        label: group.groupNumber ? `${group.groupNumber} — ${group.name}` : group.name,
      })),
    [assetGroups],
  );

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
  const handleRowClick = (params: { record: AssetListRow; index: number; event: React.MouseEvent }) => {
    const { record } = params;

    if (isGroupRow(record)) {
      toggleGroupExpansion(record.id);
      return;
    }

    const asset = record;

    if (onView) {
      onView(asset);
    } else {
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

      if (typeof filters.hasAssetGroup === 'boolean') {
        const hasGroup = Boolean(asset.assetGroup?.id);
        if (filters.hasAssetGroup && !hasGroup) {
          return false;
        }
        if (!filters.hasAssetGroup && hasGroup) {
          return false;
        }
      }

      if (filters.assetGroupId && asset.assetGroup?.id !== filters.assetGroupId) {
        return false;
      }

      return true;
    });
  }, [assets, filters.assetType, filters.prefixId, filters.hasAssetGroup, filters.assetGroupId, prefixes]);

  const viewFilteredAssets = useMemo(() => {
    if (!hasAdvancedFilters) {
      return filteredAssets;
    }
    return applyFilters(filteredAssets, viewFilters);
  }, [filteredAssets, hasAdvancedFilters, viewFilters]);

  // Sort assets (memoized to avoid re-sorting on every render) - T217
  const sortedAssets = useMemo(() => {
    return [...viewFilteredAssets].sort((a, b) => {
      const { columnAccessor, direction } = sortStatus;
      
      let aValue: string | number = '';
      let bValue: string | number = '';
      
      if (columnAccessor === 'assetNumber') {
        aValue = a.assetNumber;
        bValue = b.assetNumber;
      } else if (columnAccessor === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (columnAccessor === 'assetType') {
        aValue = a.assetType.name;
        bValue = b.assetType.name;
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
  }, [viewFilteredAssets, sortStatus]);

  const groupedMembers = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const asset of sortedAssets) {
      const groupId = asset.assetGroup?.id;
      if (!groupId) {
        continue;
      }
      const existing = map.get(groupId);
      if (existing) {
        existing.push(asset);
      } else {
        map.set(groupId, [asset]);
      }
    }
    return map;
  }, [sortedAssets]);

  const ungroupedAssets = useMemo(
    () => sortedAssets.filter((asset) => !asset.assetGroup?.id),
    [sortedAssets],
  );

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

  const paginatedTopLevelAssets = useMemo(() => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    return topLevelAssets.slice(from, to);
  }, [topLevelAssets, page, pageSize]);

  const groupEntries = useMemo(() => {
    const entries: AssetListGroupRow[] = [];

    groupedMembers.forEach((members, groupId) => {
      const metadata = groupMetadataById.get(groupId);
      const sample = members[0];
      const groupNumber = metadata?.groupNumber ?? sample?.assetGroup?.groupNumber ?? 'Group';
      const inheritedCount = metadata
        ? Object.values(metadata.inheritanceRules ?? {}).filter((rule) => rule?.inherited).length
        : undefined;
      const assetType = sample?.assetType ?? metadata?.assetType ?? null;

      entries.push({
        __kind: 'group',
        id: groupId,
        assetNumber: groupNumber,
        groupNumber,
        name: metadata?.name ?? sample?.assetGroup?.name ?? 'Asset Model',
        memberCount: metadata?.memberCount ?? members.length,
        members,
        assetType,
        manufacturer: metadata?.manufacturer ?? sample?.manufacturer ?? undefined,
        model: metadata?.model ?? sample?.model ?? undefined,
        inheritedFieldCount: inheritedCount,
        __depth: 0,
        __isExpanded: true,
      });
    });

    entries.sort((a, b) => a.groupNumber.localeCompare(b.groupNumber));

    if (ungroupedAssets.length > 0) {
      entries.push({
        __kind: 'group',
        id: UNGROUPED_GROUP_ID,
        assetNumber: 'Ungrouped',
        groupNumber: 'Ungrouped',
        name: 'Ungrouped Assets',
        memberCount: ungroupedAssets.length,
        members: ungroupedAssets,
        assetType: null,
        __depth: 0,
        __isExpanded: true,
      });
    }

    return entries;
  }, [groupMetadataById, groupedMembers, ungroupedAssets]);

  const paginatedGroupEntries = useMemo(() => {
    if (!groupViewEnabled) {
      return [];
    }
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    return groupEntries.slice(from, to);
  }, [groupEntries, groupViewEnabled, page, pageSize]);

  const totalRecordCount = groupViewEnabled ? groupEntries.length : topLevelAssets.length;

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalRecordCount / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, pageSize, totalRecordCount, setPage]);

  useEffect(() => {
    try {
      localStorage.setItem(GROUP_VIEW_STORAGE_KEY, JSON.stringify(groupViewEnabled));
    } catch (error) {
      console.warn('Failed to persist group view preference:', error);
    }
  }, [groupViewEnabled]);

  useEffect(() => {
    if (!groupViewEnabled) {
      return;
    }
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = { ...prev };
      let changed = false;
      for (const entry of groupEntries) {
        if (next[entry.id] === undefined) {
          next[entry.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [groupEntries, groupViewEnabled]);

  const displayRecords = useMemo<AssetListRow[]>(() => {
    const rows: AssetListRow[] = [];

    const appendAsset = (
      asset: Asset,
      depth: number,
      groupId: string | null,
      allowedIds?: Set<string>,
    ) => {
      const children = visibleChildrenMap[asset.id] ?? [];
      const filteredChildren = allowedIds
        ? children.filter((child) => allowedIds.has(child.id))
        : children;
      const hasVisibleChildren = filteredChildren.length > 0;
      const isExpanded = hasVisibleChildren ? (expandedParents[asset.id] ?? true) : undefined;

      rows.push({
        ...asset,
        __kind: 'asset',
        __depth: depth,
        __parentId: asset.parentAssetId,
        __hasVisibleChildren: hasVisibleChildren,
        __isExpanded: isExpanded,
        __groupId: groupId,
      });

      if (hasVisibleChildren && isExpanded) {
        const nextDepth = depth + 1;
        filteredChildren.forEach((child) => appendAsset(child, nextDepth, groupId, allowedIds));
      }
    };

    if (groupViewEnabled) {
      paginatedGroupEntries.forEach((entry) => {
        const isExpanded = expandedGroups[entry.id] ?? true;

        rows.push({
          ...entry,
          __isExpanded: isExpanded,
        });

        if (!isExpanded) {
          return;
        }

        const memberIdSet = new Set(entry.members.map((member) => member.id));
        const groupId = entry.id === UNGROUPED_GROUP_ID ? null : entry.id;
        const topLevelMembers = entry.members.filter((member) => {
          if (!member.parentAssetId) {
            return true;
          }
          return !memberIdSet.has(member.parentAssetId);
        });

        topLevelMembers.forEach((member) => {
          appendAsset(member, 1, groupId, memberIdSet);
        });
      });

      return rows;
    }

    paginatedTopLevelAssets.forEach((asset) => {
      const initialDepth = asset.parentAssetId ? 1 : 0;
      appendAsset(asset, initialDepth, asset.assetGroup?.id ?? null);
    });

    return rows;
  }, [
    expandedGroups,
    expandedParents,
    groupViewEnabled,
    paginatedGroupEntries,
    paginatedTopLevelAssets,
    visibleChildrenMap,
  ]);

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
      const createPayload = toAssetCreatePayload(deletedAsset);

      await deleteAsset.mutateAsync(asset.id);
      
      // T225: Add undo action to queue
      const undoId = addUndoAction({
        type: 'delete-asset',
        assetSnapshot: deletedAsset,
        createPayload,
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
            await createAsset.mutateAsync(action.createPayload);
            
            // Remove from undo queue
            removeUndoAction(undoId);
            
            // Close the notification
            notifications.hide(undoId);
            
            // Show success
            notifications.show({
              title: 'Asset Restored',
              message: `"${action.assetSnapshot.name}" has been restored`,
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
    if (hasAdvancedFilters) {
      setViewFilters(createFilterGroup('AND'));
    }
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

        <Select
          label="Group Membership"
          value={
            typeof filters.hasAssetGroup === 'boolean'
              ? filters.hasAssetGroup
                ? 'grouped'
                : 'ungrouped'
              : 'all'
          }
          onChange={(val) => {
            setFilters((prev) => {
              if (val === 'grouped') {
                return { ...prev, hasAssetGroup: true };
              }
              if (val === 'ungrouped') {
                return { ...prev, hasAssetGroup: false, assetGroupId: undefined };
              }
              return { ...prev, hasAssetGroup: undefined };
            });
          }}
          data={GROUP_MEMBERSHIP_OPTIONS}
        />

        <Select
          label="Asset Model"
          placeholder={loadingAssetGroups ? 'Loading groups...' : 'All groups'}
          value={filters.assetGroupId ?? null}
          onChange={(val) => {
            setFilters((prev) => {
              if (!val) {
                return { ...prev, assetGroupId: undefined };
              }
              return { ...prev, assetGroupId: val, hasAssetGroup: true };
            });
          }}
          data={groupOptions}
          clearable
          searchable
          disabled={loadingAssetGroups || groupOptions.length === 0}
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
          label="Asset Type"
          placeholder="All asset types"
          value={filters.assetTypeId ?? null}
          onChange={(val) => {
            setFilters((prev) => ({
              ...prev,
              assetTypeId: val ?? undefined,
              customFields:
                val && val === prev.assetTypeId ? prev.customFields : undefined,
            }));
          }}
          data={assetTypes.map((type) => ({
            value: type.id,
            label: `${type.icon || ''} ${type.name}`.trim(),
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

      {filters.assetTypeId && (() => {
        const selectedAssetType = assetTypes.find((type) => type.id === filters.assetTypeId);
        if (selectedAssetType && selectedAssetType.customFields.length > 0) {
          return (
            <>
              <Text size="sm" fw={600} mt="md">
                Custom Field Filters
              </Text>
              <Group grow>
                {selectedAssetType.customFields.map((field) => (
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

      {!hideAdvancedFilters && (
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={600}>
              Advanced Filters
            </Text>
            {hasAdvancedFilters && (
              <Button
                variant="subtle"
                size="xs"
                color="gray"
                leftSection={<IconX size={14} />}
                onClick={() => setViewFilters(createFilterGroup('AND'))}
              >
                Clear advanced filters
              </Button>
            )}
          </Group>
          <FilterBuilder value={viewFilters} onChange={setViewFilters} />
        </Stack>
      )}
    </Stack>
  );

  const isTableLikeView = viewMode === 'table' || viewMode === 'list';

  const groupViewToggle = (
    <Group gap="xs" align="center">
      <Text size="sm" c="dimmed">
        View
      </Text>
      <SegmentedControl
        size="xs"
        value={groupViewEnabled ? 'groups' : 'assets'}
        onChange={(value) => {
          const nextEnabled = value === 'groups';
          setGroupViewEnabled(nextEnabled);
          setPage(1);
        }}
        data={[
          { value: 'assets', label: 'Assets' },
          { value: 'groups', label: 'Groups' },
        ]}
        disabled={!groupEntries.length && !groupViewEnabled}
      />
    </Group>
  );

  const showGroupToggle = isTableLikeView && (groupEntries.length > 0 || groupViewEnabled);

  const headerActions = (!hideViewSelector || showGroupToggle)
    ? (
        <Group gap="sm" align="center">
          {!hideViewSelector && (
            <ViewSelector value={viewMode} onChange={(mode) => setViewMode(mode)} />
          )}
          {showGroupToggle && groupViewToggle}
        </Group>
      )
    : undefined;

  if (error) {
    return (
      <Card withBorder>
        <Text c="red">Error loading assets: {error.message}</Text>
      </Card>
    );
  }

  const tableViewContent = (
    <Card withBorder>
      <DataViewTable<AssetListRow>
        records={displayRecords}
        onRowClick={handleRowClick}
        rowStyle={() => ({ cursor: 'pointer' })}
        totalRecords={totalRecordCount}
        recordsPerPage={pageSize}
        recordsPerPageOptions={pageSizeOptions}
        page={page}
        onPageChange={setPage}
        onRecordsPerPageChange={(size: number) => {
          setPageSize(size);
          setPage(1);
        }}
        paginationText={({ from, to, totalRecords }: { from: number; to: number; totalRecords: number }) => {
          const label = groupViewEnabled ? 'groups' : 'assets';
          return `Showing ${from} to ${to} of ${totalRecords} ${label}`;
        }}
        columns={[
            {
              accessor: '__expander',
              title: '',
              width: 90,
              render: (row) => {
                if (isGroupRow(row)) {
                  const isExpanded = row.__isExpanded;
                  const hasMembers = row.memberCount > 0;

                  return (
                    <Group gap="xs">
                      {hasMembers ? (
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          aria-label={isExpanded ? 'Collapse group members' : 'Expand group members'}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupExpansion(row.id);
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
                      <Badge size="sm" variant="light" color="blue">
                        {row.memberCount}
                      </Badge>
                    </Group>
                  );
                }

                const childCount = row.childAssetIds?.length ?? 0;
                const isExpanded = row.__isExpanded ?? false;
                const isParent = row.isParent;

                return (
                  <Group gap="xs">
                    {row.__hasVisibleChildren ? (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        aria-label={isExpanded ? 'Collapse sub assets' : 'Expand sub assets'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedParents((prev) => ({
                            ...prev,
                            [row.id]: !(prev[row.id] ?? true),
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
              render: (row) => {
                if (isGroupRow(row)) {
                  return (
                    <Text fw={600} size="sm">
                      {row.groupNumber}
                    </Text>
                  );
                }

                return (
                  <Text
                    fw={600}
                    size="sm"
                    style={{ paddingLeft: `${row.__depth * 16}px` }}
                  >
                    {row.assetNumber}
                  </Text>
                );
              },
            },
            {
              accessor: 'name',
              title: 'Name',
              sortable: true,
              render: (row) => {
                if (isGroupRow(row)) {
                  return (
                    <Box>
                      <Text fw={600}>{row.name}</Text>
                      <Text size="xs" c="dimmed">
                        {row.memberCount} members
                        {typeof row.inheritedFieldCount === 'number' && row.inheritedFieldCount > 0
                          ? ` · ${row.inheritedFieldCount} inherited fields`
                          : ''}
                      </Text>
                    </Box>
                  );
                }

                return (
                  <Box style={{ marginLeft: `${row.__depth * 16}px` }}>
                    <Group gap="xs">
                      <Text fw={500}>{row.name}</Text>
                      {row.isKit && (
                        <Badge size="xs" variant="light" color="violet" leftSection={<IconPackage size={10} />}>
                          Kit
                        </Badge>
                      )}
                    </Group>
                    {row.description && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {row.description}
                      </Text>
                    )}
                  </Box>
                );
              },
            },
            {
              accessor: 'assetType',
              title: 'Asset Type',
              sortable: true,
              render: (row) => {
                if (isGroupRow(row)) {
                  if (!row.assetType) {
                    return (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    );
                  }
                  return (
                    <Badge variant="light" color="blue">
                      {row.assetType.name}
                    </Badge>
                  );
                }

                const icon = row.assetType.icon;
                return (
                  <Badge
                    variant="light"
                    color="blue"
                    leftSection={icon ? <IconDisplay iconName={icon} size={14} /> : undefined}
                  >
                    {row.assetType.name}
                  </Badge>
                );
              },
            },
            {
              accessor: 'status',
              title: 'Status',
              sortable: true,
              render: (row) => {
                if (isGroupRow(row)) {
                  return (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  );
                }
                return <AssetStatusBadge status={row.status} />;
              },
            },
            {
              accessor: 'location',
              title: 'Location',
              sortable: true,
              render: (row) => {
                if (isGroupRow(row)) {
                  return (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  );
                }
                return (
                  <Text size="sm" c={row.location ? undefined : 'dimmed'}>
                    {row.location || '—'}
                  </Text>
                );
              },
            },
            {
              accessor: 'manufacturer',
              title: 'Manufacturer',
              render: (row) => {
                if (isGroupRow(row)) {
                  if (!row.manufacturer && !row.model) {
                    return (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    );
                  }
                  return (
                    <Box>
                      <Text size="sm">{row.manufacturer ?? 'Mixed manufacturers'}</Text>
                      {row.model && (
                        <Text size="xs" c="dimmed">
                          {row.model}
                        </Text>
                      )}
                    </Box>
                  );
                }

                return (
                  <Box>
                    <Text size="sm" c={row.manufacturer ? undefined : 'dimmed'}>
                      {row.manufacturer || '—'}
                    </Text>
                    {row.model && (
                      <Text size="xs" c="dimmed">
                        {row.model}
                      </Text>
                    )}
                  </Box>
                );
              },
            },
            {
              accessor: 'maintenance',
              title: 'Maintenance',
              width: 120,
              render: (row) => {
                if (isGroupRow(row)) {
                  return null;
                }
                const schedule = maintenanceSchedules.find((s) => s.assetId === row.id);
                return schedule ? <MaintenanceReminderBadge schedule={schedule} /> : null;
              },
            },
            {
              accessor: 'actions',
              title: '',
              width: 60,
              render: (row) => {
                if (!isAssetRow(row)) {
                  return null;
                }

                return (
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
                              onView(row);
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
                              onEdit(row);
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
                            void handleDelete(row);
                          }}
                          disabled={deleteAsset.isPending}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                );
              },
            },
          ]}
        sortStatus={sortStatus as DataTableSortStatus<AssetListRow>}
        onSortStatusChange={(status) => {
          setSortStatus(status as AssetListSortStatus);
        }}
        fetching={isLoading}
        minHeight={150}
        noRecordsText={groupViewEnabled
          ? (combinedHasFilters ? 'No groups match your filters' : 'No groups found')
          : (combinedHasFilters ? 'No assets match your filters' : 'No assets found')}
      />
    </Card>
  );

  let currentViewContent: ReactNode;
  switch (viewMode) {
    case 'gallery':
      currentViewContent = <AssetGalleryView assets={sortedAssets} />;
      break;
    case 'kanban':
      currentViewContent = <AssetKanbanView assets={sortedAssets} />;
      break;
    case 'calendar':
      currentViewContent = <AssetCalendarView assets={sortedAssets} />;
      break;
    case 'list':
    case 'table':
    default:
      currentViewContent = tableViewContent;
  }

  return (
    <DataViewLayout
      title="Assets"
      mode="table"
      availableModes={['table']}
      filtersOpen={filtersPanelOpen}
      onToggleFilters={toggleFilters}
      hasActiveFilters={combinedHasFilters}
      activeFilterCount={combinedFilterCount}
      showFilterButton={hideFilterButton !== true}
      filterContent={filterContent}
      actions={headerActions}
    >
      {currentViewContent}
    </DataViewLayout>
  );
}

/**
 * Memoized AssetList component to prevent unnecessary re-renders (T216)
 * Only re-renders when props actually change
 */
export const AssetListMemo = memo(AssetList);
