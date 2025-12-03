/**
 * Enhanced AssetList with Phase 11 Integration (T209-T212)
 * 
 * Integrates ViewModeSelector, FilterBuilder, SavedViews, and view persistence
 */

import { useState, useMemo, useEffect } from 'react';
import {
  ActionIcon,
  Button,
  Drawer,
  Group,
  Menu,
  Modal,
  Stack,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBookmark,
  IconChevronDown,
  IconDeviceFloppy,
  IconPackage,
  IconPlus,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import type { Asset, AssetFilters, SavedView, ViewFilterGroup } from '../../types/entities';
import { useAssets } from '../../hooks/useAssets';
import { useUIStore } from '../../stores/uiStore';
import { useFeatureSettingsStore } from '../../stores';
import { ViewSelector } from '../views/ViewSelector';
import { NotionFilterBar } from '../views/NotionFilterBar';
import { SavedViewForm } from '../reports/SavedViewForm';
import { SavedViewsList } from '../reports/SavedViewsList';
import { AssetGalleryView } from './AssetGalleryView';
import { AssetKanbanView } from './AssetKanbanView';
import { AssetCalendarView } from './AssetCalendarView';
import { applyFilters, sortAssets } from '../../utils/filterEvaluation';
import { readFiltersFromUrl, updateUrlWithFilters } from '../../utils/urlFilters';
import { countFilterConditions, createFilterGroup, flattenFilterConditions, hasActiveFilters } from '../../utils/viewFilters';

// Import the original AssetList as AssetTableView
import { AssetList as AssetTableView } from './AssetList';

interface EnhancedAssetListProps {
  onView?: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  onCreateNew?: () => void;
  onCreateKit?: () => void;
}

/**
 * Enhanced AssetList with view modes, filters, and saved views
 */
export function EnhancedAssetList({ onView, onEdit, onCreateNew, onCreateKit }: EnhancedAssetListProps) {
  const { t: tAssets } = useTranslation('assets');
  const { t: tViews } = useTranslation('views');
  const kitsEnabled = useFeatureSettingsStore((state) => state.kitsEnabled);
  // T213: Use UI store for view preferences
  const {
    viewMode,
    setViewMode,
    quickFilters,
    setQuickFilters,
    clearQuickFilters,
    viewFilters,
    setViewFilters,
    clearViewFilters,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    groupBy,
    setGroupBy,
  } = useUIStore();

  // T211: Save view modal
  const [showSaveView, setShowSaveView] = useState(false);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);

  // T212: Saved views menu with localStorage persistence
  const [showSavedViews, setShowSavedViews] = useState(() => {
    try {
      const saved = localStorage.getItem('enhanced-asset-list-saved-views-open');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Persist saved views drawer state
  useEffect(() => {
    try {
      localStorage.setItem('enhanced-asset-list-saved-views-open', JSON.stringify(showSavedViews));
    } catch (error) {
      console.warn('Failed to save saved views drawer state:', error);
    }
  }, [showSavedViews]);

  const { data: assets = [] } = useAssets();
  const quickFilterCount = useMemo(() => countFilterConditions(quickFilters), [quickFilters]);
  const advancedFilterCount = useMemo(() => countFilterConditions(viewFilters), [viewFilters]);
  const activeFilterCount = quickFilterCount + advancedFilterCount;

  const filtersToApply = useMemo((): ViewFilterGroup => {
    const activeGroups: ViewFilterGroup[] = [];
    if (quickFilters && hasActiveFilters(quickFilters)) {
      activeGroups.push(quickFilters);
    }
    if (viewFilters && hasActiveFilters(viewFilters)) {
      activeGroups.push(viewFilters);
    }

    if (activeGroups.length === 0) {
      return createFilterGroup('AND');
    }

    if (activeGroups.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length check guarantees existence
      return activeGroups[0]!;
    }

    return createFilterGroup('AND', activeGroups);
  }, [quickFilters, viewFilters]);

  const shouldApplyFilters = hasActiveFilters(filtersToApply);

  const handleCreateKit = () => {
    onCreateKit?.();
  };

  const handleClearAllFilters = () => {
    clearQuickFilters();
    clearViewFilters();
  };

  // T200: Read filters from URL on mount
  useEffect(() => {
    const urlState = readFiltersFromUrl();
    if (urlState.filters) {
      setViewFilters(urlState.filters);
    }
    if (urlState.quickFilters) {
      setQuickFilters(urlState.quickFilters);
    }
    if (urlState.viewMode) {
      setViewMode(urlState.viewMode);
    }
    if (urlState.sortBy) {
      setSortBy(urlState.sortBy);
    }
    if (urlState.sortDirection) {
      setSortDirection(urlState.sortDirection);
    }
    if (urlState.groupBy) {
      setGroupBy(urlState.groupBy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // T200: Update URL when view state changes
  useEffect(() => {
    updateUrlWithFilters(
      viewFilters,
      viewMode,
      sortBy || undefined,
      sortDirection,
      groupBy || undefined,
      quickFilters,
    );
  }, [viewFilters, viewMode, sortBy, sortDirection, groupBy, quickFilters]);

  // T197: Apply advanced filters
  const filteredAssets = useMemo(() => {
    if (!shouldApplyFilters) {
      return assets;
    }
    return applyFilters(assets, filtersToApply);
  }, [assets, filtersToApply, shouldApplyFilters]);

  // T201: Apply sorting
  const sortedAssets = useMemo(() => {
    if (!sortBy) return filteredAssets;
    return sortAssets(filteredAssets, sortBy, sortDirection);
  }, [filteredAssets, sortBy, sortDirection]);

  // T211: Handle save current view
  const handleSaveCurrentView = () => {
    setEditingViewId(null);
    setShowSaveView(true);
  };

  const closeSaveViewModal = () => {
    setShowSaveView(false);
    setEditingViewId(null);
  };

    // T212: Handle load saved view
  const handleLoadSavedView = (view: SavedView) => {
    setViewMode(view.viewMode);
    setViewFilters(view.filters);
    if (view.quickFilters) {
      setQuickFilters(view.quickFilters);
    } else {
      clearQuickFilters();
    }
    if (view.sortBy) setSortBy(view.sortBy);
    if (view.sortDirection) setSortDirection(view.sortDirection);
    if (view.groupBy) setGroupBy(view.groupBy);
    setShowSavedViews(false);
    notifications.show({
      title: tAssets('list.notifications.viewLoaded', { name: view.name }),
      message: tAssets('list.notifications.viewLoaded', { name: view.name }),
      color: 'blue',
    });
  };

  // Convert ViewFilters to AssetFilters for table view compatibility
  const legacyFilters: AssetFilters = useMemo(() => {
    const filters: AssetFilters = {};
    const conditions = flattenFilterConditions(filtersToApply);
    for (const filter of conditions) {
      if (filter.field === 'category.name' && filter.operator === 'equals') {
        // Note: This is a simplified conversion - full implementation would need category ID lookup
        filters.assetTypeId = String(filter.value);
      } else if (filter.field === 'status' && filter.operator === 'equals') {
        filters.status = String(filter.value) as AssetFilters['status'];
      } else if (filter.field === 'location' && filter.operator === 'equals') {
        filters.location = String(filter.value);
      } else if (filter.field === 'name' && filter.operator === 'contains') {
        filters.search = String(filter.value);
      }
    }
    return filters;
  }, [filtersToApply]);

  // Render view based on current mode
  const renderView = () => {
    switch (viewMode) {
      case 'table':
        return (
          <AssetTableView
            onView={onView}
            onEdit={onEdit}
            initialFilters={legacyFilters}
            hideFilterButton
            hideViewSelector
            hideAdvancedFilters
          />
        );
      case 'gallery':
        return <AssetGalleryView assets={sortedAssets} />;
      case 'kanban':
        return <AssetKanbanView assets={sortedAssets} />;
      case 'calendar':
        return <AssetCalendarView assets={sortedAssets} />;
      case 'list':
        // Fallback to table for now
        return (
          <AssetTableView
            onView={onView}
            onEdit={onEdit}
            initialFilters={legacyFilters}
            hideFilterButton
            hideViewSelector
            hideAdvancedFilters
          />
        );
      default:
        return (
          <AssetTableView
            onView={onView}
            onEdit={onEdit}
            initialFilters={legacyFilters}
            hideFilterButton
            hideViewSelector
            hideAdvancedFilters
          />
        );
    }
  };

  return (
    <Stack gap="sm">
      {/* Compact Header */}
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={3}>{tAssets('list.title')}</Title>

        <Group gap="xs">
          {/* T209: ViewSelector integration */}
          <ViewSelector value={viewMode} onChange={setViewMode} />

          {/* T212: Saved views quick access */}
          <Tooltip label="Views">
            <ActionIcon variant="default" size="lg" onClick={() => setShowSavedViews(true)}>
              <IconBookmark size={18} />
            </ActionIcon>
          </Tooltip>

          {/* T211: Save current view button */}
          <Tooltip label="Save view">
            <ActionIcon 
              variant="default" 
              size="lg" 
              onClick={handleSaveCurrentView}
              disabled={activeFilterCount === 0}
            >
              <IconDeviceFloppy size={18} />
            </ActionIcon>
          </Tooltip>

          {onCreateNew && (
            <Menu position="bottom-end" shadow="md">
              <Menu.Target>
                <Button size="sm" leftSection={<IconPlus size={16} />} rightSection={<IconChevronDown size={14} />}>
                  {tAssets('list.actions.new')}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconPlus size={16} />} onClick={onCreateNew}>
                  New Asset
                </Menu.Item>
                {kitsEnabled && onCreateKit && (
                  <Menu.Item leftSection={<IconPackage size={16} />} onClick={handleCreateKit}>
                    Create Kit
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>

      {/* Notion-style filter bar */}
      <NotionFilterBar
        quickFilters={quickFilters}
        advancedFilters={viewFilters}
        onQuickFiltersChange={setQuickFilters}
        onAdvancedFiltersChange={setViewFilters}
        onClearAll={handleClearAllFilters}
      />

      {/* Render current view mode */}
      {renderView()}

      {/* T211: Save view modal */}
      <Modal
        opened={showSaveView}
        onClose={closeSaveViewModal}
        title={tViews('form.title')}
        size="md"
      >
        <SavedViewForm
          viewMode={viewMode}
          filters={viewFilters}
          quickFilters={quickFilterCount > 0 ? quickFilters : undefined}
          sortBy={sortBy || undefined}
          sortDirection={sortDirection}
          groupBy={groupBy || undefined}
          existingViewId={editingViewId ?? undefined}
          onSuccess={() => {
            closeSaveViewModal();
            notifications.show({
              title: tViews('notifications.createSuccessTitle'),
              message: tViews('notifications.createSuccessMessage'),
              color: 'green',
            });
          }}
          onCancel={closeSaveViewModal}
        />
      </Modal>

      {/* T212: Saved views drawer */}
      <Drawer
        opened={showSavedViews}
        onClose={() => setShowSavedViews(false)}
        title={tViews('drawer.title')}
        position="right"
        size="md"
      >
        <SavedViewsList
          onSelectView={handleLoadSavedView}
          onEditView={(view) => {
            // Load view for editing
            handleLoadSavedView(view);
            setEditingViewId(view.id);
            setShowSaveView(true);
          }}
        />
      </Drawer>
    </Stack>
  );
}
