/**
 * Enhanced AssetList with Phase 11 Integration (T209-T212)
 * 
 * Integrates ViewModeSelector, FilterBuilder, SavedViews, and view persistence
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Button,
  Card,
  Group,
  Menu,
  Modal,
  Stack,
  Title,
  Drawer,
  Collapse,
} from '@mantine/core';
import {
  IconFilter,
  IconPlus,
  IconDeviceFloppy,
  IconBookmark,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { Asset, AssetFilters, SavedView } from '../../types/entities';
import { useAssets } from '../../hooks/useAssets';
import { useUIStore } from '../../stores/uiStore';
import { ViewSelector } from '../views/ViewSelector';
import { FilterBuilder } from '../views/FilterBuilder';
import { SavedViewForm } from '../reports/SavedViewForm';
import { SavedViewsList } from '../reports/SavedViewsList';
import { AssetGalleryView } from './AssetGalleryView';
import { AssetKanbanView } from './AssetKanbanView';
import { AssetCalendarView } from './AssetCalendarView';
import { applyFilters, sortAssets } from '../../utils/filterEvaluation';
import { readFiltersFromUrl, updateUrlWithFilters } from '../../utils/urlFilters';

// Import the original AssetList as AssetTableView
import { AssetList as AssetTableView } from './AssetList';

interface EnhancedAssetListProps {
  onView?: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  onCreateNew?: () => void;
}

/**
 * Enhanced AssetList with view modes, filters, and saved views
 */
export function EnhancedAssetList({ onView, onEdit, onCreateNew }: EnhancedAssetListProps) {
  // T213: Use UI store for view preferences
  const {
    viewMode,
    setViewMode,
    viewFilters,
    setViewFilters,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    groupBy,
    setGroupBy,
  } = useUIStore();

  // T210: Filter builder state with localStorage persistence
  const [filtersPanelOpen, setFiltersPanelOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('churchtools-inventory-filter-panel-expanded');
    return saved ? JSON.parse(saved) === true : false;
  });

  // Persist filter panel state to localStorage
  useEffect(() => {
    localStorage.setItem('churchtools-inventory-filter-panel-expanded', JSON.stringify(filtersPanelOpen));
  }, [filtersPanelOpen]);

  // T211: Save view modal
  const [showSaveView, setShowSaveView] = useState(false);

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

  // T200: Read filters from URL on mount
  useEffect(() => {
    const urlState = readFiltersFromUrl();
    if (urlState.filters.length > 0) {
      setViewFilters(urlState.filters);
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
      groupBy || undefined
    );
  }, [viewFilters, viewMode, sortBy, sortDirection, groupBy]);

  // T197: Apply advanced filters
  const filteredAssets = useMemo(() => {
    if (viewFilters.length === 0) return assets;
    return applyFilters(assets, viewFilters);
  }, [assets, viewFilters]);

  // T201: Apply sorting
  const sortedAssets = useMemo(() => {
    if (!sortBy) return filteredAssets;
    return sortAssets(filteredAssets, sortBy, sortDirection);
  }, [filteredAssets, sortBy, sortDirection]);

  // T211: Handle save current view
  const handleSaveCurrentView = () => {
    setShowSaveView(true);
  };

    // T212: Handle load saved view
  const handleLoadSavedView = (view: SavedView) => {
    setViewMode(view.viewMode);
    setViewFilters(view.filters);
    if (view.sortBy) setSortBy(view.sortBy);
    if (view.sortDirection) setSortDirection(view.sortDirection);
    if (view.groupBy) setGroupBy(view.groupBy);
    setShowSavedViews(false);
    notifications.show({
      title: 'View loaded',
      message: `View "${view.name}" applied`,
      color: 'blue',
    });
  };

  // Convert ViewFilters to AssetFilters for table view compatibility
  const legacyFilters: AssetFilters = useMemo(() => {
    const filters: AssetFilters = {};
    for (const filter of viewFilters) {
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
  }, [viewFilters]);

  // Render view based on current mode
  const renderView = () => {
    switch (viewMode) {
      case 'table':
        return (
          <AssetTableView
            onView={onView}
            onEdit={onEdit}
            onCreateNew={undefined}
            initialFilters={legacyFilters}
            hideFilterButton
            filtersOpen={filtersPanelOpen}
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
            onCreateNew={undefined}
            initialFilters={legacyFilters}
            hideFilterButton
            filtersOpen={filtersPanelOpen}
            hideViewSelector
            hideAdvancedFilters
          />
        );
      default:
        return (
          <AssetTableView
            onView={onView}
            onEdit={onEdit}
            onCreateNew={undefined}
            initialFilters={legacyFilters}
            hideFilterButton
            filtersOpen={filtersPanelOpen}
            hideViewSelector
            hideAdvancedFilters
          />
        );
    }
  };

  return (
    <Stack gap="md">
      {/* Header with ViewModeSelector and actions */}
      <Group justify="space-between">
        <Title order={2}>Inventory</Title>

        <Group>
          {/* T209: ViewSelector integration */}
          <ViewSelector value={viewMode} onChange={setViewMode} />

          {/* T212: Saved views quick access */}
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <Button variant="default" leftSection={<IconBookmark size={16} />}>
                Views
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Saved views</Menu.Label>
              <Menu.Item onClick={() => setShowSavedViews(true)}>
                Show all views...
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          {/* T210: Filter builder toggle */}
          <Button
            variant={filtersPanelOpen ? 'filled' : 'default'}
            leftSection={<IconFilter size={16} />}
            onClick={() => setFiltersPanelOpen((prev) => !prev)}
          >
            Filters {viewFilters.length > 0 && `(${viewFilters.length})`}
          </Button>

          {/* T211: Save current view button */}
          <Button
            variant="default"
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSaveCurrentView}
            disabled={viewFilters.length === 0}
          >
            Save view
          </Button>

          {onCreateNew && (
            <Button leftSection={<IconPlus size={16} />} onClick={onCreateNew}>
              New
            </Button>
          )}
        </Group>
      </Group>

      {/* T210: Filter builder panel with smooth collapse animation */}
      <Collapse in={filtersPanelOpen}>
        <Card withBorder>
          <FilterBuilder filters={viewFilters} onChange={setViewFilters} />
        </Card>
      </Collapse>

      {/* Render current view mode */}
      {renderView()}

      {/* T211: Save view modal */}
      <Modal
        opened={showSaveView}
        onClose={() => setShowSaveView(false)}
        title="Save view"
        size="md"
      >
        <SavedViewForm
          viewMode={viewMode}
          filters={viewFilters}
          sortBy={sortBy || undefined}
          sortDirection={sortDirection}
          groupBy={groupBy || undefined}
          onSuccess={() => {
            setShowSaveView(false);
            notifications.show({
              title: 'Success',
              message: 'View saved',
              color: 'green',
            });
          }}
          onCancel={() => setShowSaveView(false)}
        />
      </Modal>

      {/* T212: Saved views drawer */}
      <Drawer
        opened={showSavedViews}
        onClose={() => setShowSavedViews(false)}
        title="Saved views"
        position="right"
        size="md"
      >
        <SavedViewsList
          onSelectView={handleLoadSavedView}
          onEditView={(view) => {
            // Load view for editing
            handleLoadSavedView(view);
            setShowSaveView(true);
          }}
        />
      </Drawer>
    </Stack>
  );
}
