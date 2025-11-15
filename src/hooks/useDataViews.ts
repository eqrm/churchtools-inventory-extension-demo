import { useCallback, useEffect, useMemo } from 'react';
import type { AppliedGroup, DataViewDefinition, DataViewRecord } from '../types/dataView';
import { DataViewService, type CreateDataViewInput, type UpdateDataViewInput } from '../services/DataViewService';
import { useDataViewStore } from '../stores/dataViewStore';
import { useCurrentUser } from './useCurrentUser';

type CreateDataViewArgs = Omit<CreateDataViewInput, 'ownerId'> & Partial<Pick<CreateDataViewInput, 'ownerId'>>;

type ApplyViewOptions = {
  viewId?: string;
  includeGrouping?: boolean;
};

type ApplyViewResult = {
  records: DataViewRecord[];
  groups: AppliedGroup[] | null;
  allGroups: AppliedGroup[] | null;
};

const sharedService = new DataViewService();

export interface UseDataViewsOptions {
  ownerId?: string;
  autoLoad?: boolean;
  service?: DataViewService;
}

interface UseDataViewsResult {
  views: DataViewDefinition[];
  activeView?: DataViewDefinition;
  activeViewId?: string;
  isLoading: boolean;
  error?: string;
  collapsedGroupKeys: string[];
  setActiveViewId: (id: string | undefined) => void;
  loadViews: () => Promise<DataViewDefinition[]>;
  refresh: () => Promise<DataViewDefinition[]>;
  createView: (input: CreateDataViewArgs) => Promise<DataViewDefinition>;
  updateView: (id: string, updates: UpdateDataViewInput) => Promise<DataViewDefinition>;
  deleteView: (id: string) => Promise<void>;
  applyView: (records: DataViewRecord[], options?: ApplyViewOptions) => ApplyViewResult;
  setCollapsedGroups: (groupKeys: string[], viewId?: string) => void;
  toggleGroupCollapsed: (groupKey: string, viewId?: string) => void;
}

function mapGroups(map: Map<string, DataViewRecord[]>): AppliedGroup[] {
  return Array.from(map.entries()).map(([key, records]) => ({
    key,
    label: key,
    records,
  }));
}

export function useDataViews(options?: UseDataViewsOptions): UseDataViewsResult {
  const { ownerId: explicitOwnerId, autoLoad = true, service: serviceOverride } = options ?? {};
  const { data: currentUser } = useCurrentUser();
  const resolvedOwnerId = explicitOwnerId ?? currentUser?.id;
  const service = useMemo(() => serviceOverride ?? sharedService, [serviceOverride]);

  const ownerId = useDataViewStore((state) => state.ownerId);
  const hasHydrated = useDataViewStore((state) => state.hasHydrated);
  const isLoading = useDataViewStore((state) => state.isLoading);
  const error = useDataViewStore((state) => state.error);
  const views = useDataViewStore((state) =>
    state.viewOrder
      .map((id) => state.viewsById[id])
      .filter((view): view is DataViewDefinition => Boolean(view)),
  );
  const activeViewId = useDataViewStore((state) => state.activeViewId);
  const activeView = useDataViewStore((state) => (state.activeViewId ? state.viewsById[state.activeViewId] : undefined));
  const collapsedGroupKeys = useDataViewStore((state) => (state.activeViewId ? state.collapsedGroupsByView[state.activeViewId] ?? [] : []));

  const setOwner = useDataViewStore((state) => state.setOwner);
  const setLoading = useDataViewStore((state) => state.setLoading);
  const setError = useDataViewStore((state) => state.setError);
  const setViews = useDataViewStore((state) => state.setViews);
  const upsertView = useDataViewStore((state) => state.upsertView);
  const removeView = useDataViewStore((state) => state.removeView);
  const setActiveView = useDataViewStore((state) => state.setActiveView);
  const setCollapsedGroupsInStore = useDataViewStore((state) => state.setCollapsedGroups);
  const toggleGroupCollapsedInStore = useDataViewStore((state) => state.toggleGroupCollapsed);

  useEffect(() => {
    if (resolvedOwnerId !== ownerId) {
      setOwner(resolvedOwnerId);
    }
  }, [ownerId, resolvedOwnerId, setOwner]);

  const loadViews = useCallback(async () => {
    if (!resolvedOwnerId) {
      throw new Error('Owner ID is required to load data views.');
    }

    setLoading(true);
    setError(undefined);

    try {
      const data = await service.getUserViews(resolvedOwnerId);
      setViews(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden der Ansichten.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [resolvedOwnerId, service, setError, setLoading, setViews]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }
    if (!resolvedOwnerId) {
      return;
    }
    if (hasHydrated || isLoading) {
      return;
    }

    void loadViews().catch(() => undefined);
  }, [autoLoad, resolvedOwnerId, hasHydrated, isLoading, loadViews]);

  const createView = useCallback(async (input: CreateDataViewArgs) => {
    const ownerForCreate = input.ownerId ?? resolvedOwnerId;
    if (!ownerForCreate) {
      throw new Error('Owner ID is required to create a data view.');
    }

    const payload: CreateDataViewInput = {
      ...input,
      ownerId: ownerForCreate,
    };

    const result = await service.createView(payload);
    upsertView(result);
    setActiveView(result.id);
    return result;
  }, [resolvedOwnerId, service, setActiveView, upsertView]);

  const updateView = useCallback(async (id: string, updates: UpdateDataViewInput) => {
    const result = await service.updateView(id, updates);
    upsertView(result);
    return result;
  }, [service, upsertView]);

  const deleteView = useCallback(async (id: string) => {
    await service.deleteView(id);
    removeView(id);
  }, [removeView, service]);

  const applyView = useCallback((records: DataViewRecord[], options?: ApplyViewOptions): ApplyViewResult => {
    const targetId = options?.viewId ?? activeViewId;
    const target = targetId ? useDataViewStore.getState().viewsById[targetId] : undefined;

    if (!target) {
      return {
        records: [...records],
        groups: null,
        allGroups: null,
      };
    }

    const filtered = target.filters.length > 0 ? service.applyFilters(records, target.filters) : [...records];
    const sorted = target.sorts.length > 0 ? service.applySorts(filtered, target.sorts) : filtered;

    if (!options?.includeGrouping || !target.grouping) {
      return {
        records: sorted,
        groups: null,
        allGroups: null,
      };
    }

    const groupedMap = service.groupRecords(sorted, target.grouping);
    const allGroups = mapGroups(groupedMap);
    const collapsedKeys = useDataViewStore.getState().collapsedGroupsByView[target.id] ?? [];
    const groups = allGroups.filter((group) => !collapsedKeys.includes(group.key));

    return {
      records: sorted,
      groups,
      allGroups,
    };
  }, [activeViewId, service]);

  const setCollapsedGroups = useCallback((groupKeys: string[], viewId?: string) => {
    const targetId = viewId ?? activeViewId;
    if (!targetId) {
      return;
    }
    setCollapsedGroupsInStore(targetId, groupKeys);
  }, [activeViewId, setCollapsedGroupsInStore]);

  const toggleGroupCollapsed = useCallback((groupKey: string, viewId?: string) => {
    const targetId = viewId ?? activeViewId;
    if (!targetId) {
      return;
    }
    toggleGroupCollapsedInStore(targetId, groupKey);
  }, [activeViewId, toggleGroupCollapsedInStore]);

  const refresh = useCallback(async () => await loadViews(), [loadViews]);

  return {
    views,
    activeView,
    activeViewId,
    isLoading,
    error,
    collapsedGroupKeys,
    setActiveViewId: setActiveView,
    loadViews,
    refresh,
    createView,
    updateView,
    deleteView,
    applyView,
    setCollapsedGroups,
    toggleGroupCollapsed,
  };
}
