import { create } from 'zustand';
import type { DataViewDefinition } from '../types/dataView';

type CollapsedGroupMap = Record<string, string[]>;

type ViewsById = Record<string, DataViewDefinition>;

interface DataViewStoreState {
  ownerId?: string;
  isLoading: boolean;
  error?: string;
  hasHydrated: boolean;
  viewsById: ViewsById;
  viewOrder: string[];
  activeViewId?: string;
  collapsedGroupsByView: CollapsedGroupMap;
  setOwner: (ownerId: string | undefined) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error?: string) => void;
  setViews: (views: DataViewDefinition[]) => void;
  upsertView: (view: DataViewDefinition) => void;
  removeView: (id: string) => void;
  setActiveView: (id: string | undefined) => void;
  setCollapsedGroups: (viewId: string, groupKeys: string[]) => void;
  toggleGroupCollapsed: (viewId: string, groupKey: string) => void;
  reset: () => void;
}

const STORAGE_PREFIX = 'ct-inventory:data-view:collapsed-groups';

function createStorageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}:${ownerId}`;
}

function readCollapsedGroups(ownerId: string | undefined): CollapsedGroupMap {
  if (!ownerId || typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(createStorageKey(ownerId));
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const entries = Object.entries(parsed as Record<string, unknown>).map(([viewId, groupKeys]) => {
      if (!Array.isArray(groupKeys)) {
        return [viewId, [] as string[]];
      }
      const uniqueKeys = Array.from(new Set(groupKeys.map((key) => String(key))));
      return [viewId, uniqueKeys];
    });

    return Object.fromEntries(entries);
  } catch (error) {
    console.warn('Failed to restore data view collapsed groups from storage.', error);
    return {};
  }
}

function persistCollapsedGroups(ownerId: string | undefined, groups: CollapsedGroupMap): void {
  if (!ownerId || typeof window === 'undefined') {
    return;
  }

  try {
    const sanitized = Object.fromEntries(
      Object.entries(groups).map(([viewId, groupKeys]) => [viewId, Array.from(new Set(groupKeys))]),
    );
    window.localStorage.setItem(createStorageKey(ownerId), JSON.stringify(sanitized));
  } catch (error) {
    console.warn('Failed to persist data view collapsed groups.', error);
  }
}

function pruneCollapsedGroups(map: CollapsedGroupMap, validViewIds: string[]): CollapsedGroupMap {
  const valid = new Set(validViewIds);
  return Object.fromEntries(
    Object.entries(map)
      .filter(([viewId]) => valid.has(viewId))
      .map(([viewId, groupKeys]) => [viewId, Array.from(new Set(groupKeys))]),
  );
}

function sortViewIds(views: DataViewDefinition[]): string[] {
  return [...views]
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
        return bTime - aTime;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    })
    .map((view) => view.id);
}

export const useDataViewStore = create<DataViewStoreState>((set, get) => ({
  ownerId: undefined,
  isLoading: false,
  error: undefined,
  hasHydrated: false,
  viewsById: {},
  viewOrder: [],
  activeViewId: undefined,
  collapsedGroupsByView: {},

  setOwner: (ownerId) => {
    const state = get();
    if (state.ownerId === ownerId) {
      return;
    }

    const collapsedGroups = readCollapsedGroups(ownerId);

    set({
      ownerId,
      isLoading: false,
      error: undefined,
      hasHydrated: false,
      viewsById: {},
      viewOrder: [],
      activeViewId: undefined,
      collapsedGroupsByView: collapsedGroups,
    });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  setViews: (views) => {
    const viewOrder = sortViewIds(views);

    set((state) => {
      const viewsById = views.reduce<ViewsById>((acc, view) => {
        acc[view.id] = view;
        return acc;
      }, {});

      const activeViewId = state.activeViewId && viewsById[state.activeViewId]
        ? state.activeViewId
        : viewOrder[0];

      const collapsedGroups = pruneCollapsedGroups(state.collapsedGroupsByView, viewOrder);
      persistCollapsedGroups(state.ownerId, collapsedGroups);

      return {
        viewsById,
        viewOrder,
        activeViewId,
        hasHydrated: true,
        collapsedGroupsByView: collapsedGroups,
      };
    });
  },

  upsertView: (view) => {
    set((state) => {
      const viewsById: ViewsById = { ...state.viewsById, [view.id]: view };
      const viewOrder = sortViewIds(Object.values(viewsById));
      const activeViewId = state.activeViewId ?? view.id;
      const collapsedGroups = pruneCollapsedGroups(state.collapsedGroupsByView, viewOrder);
      persistCollapsedGroups(state.ownerId, collapsedGroups);

      return {
        viewsById,
        viewOrder,
        activeViewId: viewsById[activeViewId] ? activeViewId : view.id,
        hasHydrated: true,
        collapsedGroupsByView: collapsedGroups,
      };
    });
  },

  removeView: (id) => {
    set((state) => {
      if (!state.viewsById[id]) {
        return {};
      }

      const { [id]: _removed, ...rest } = state.viewsById;
      const viewOrder = sortViewIds(Object.values(rest));
      const activeViewId = state.activeViewId === id ? viewOrder[0] : state.activeViewId;
      const { [id]: _collapsedRemoved, ...collapsedRest } = state.collapsedGroupsByView;
      persistCollapsedGroups(state.ownerId, collapsedRest);

      return {
        viewsById: rest,
        viewOrder,
        activeViewId,
        collapsedGroupsByView: collapsedRest,
      };
    });
  },

  setActiveView: (id) => {
    set((state) => {
      if (!id) {
        return { activeViewId: undefined };
      }

      if (!state.viewsById[id]) {
        return {};
      }

      return { activeViewId: id };
    });
  },

  setCollapsedGroups: (viewId, groupKeys) => {
    set((state) => ({
      collapsedGroupsByView: (() => {
        const next = {
          ...state.collapsedGroupsByView,
          [viewId]: [...new Set(groupKeys)],
        } satisfies CollapsedGroupMap;
        persistCollapsedGroups(state.ownerId, next);
        return next;
      })(),
    }));
  },

  toggleGroupCollapsed: (viewId, groupKey) => {
    set((state) => {
      const current = state.collapsedGroupsByView[viewId] ?? [];
      const exists = current.includes(groupKey);
      const next = exists ? current.filter((key) => key !== groupKey) : [...current, groupKey];

      const nextState = {
        ...state.collapsedGroupsByView,
        [viewId]: next,
      } satisfies CollapsedGroupMap;

      persistCollapsedGroups(state.ownerId, nextState);

      return {
        collapsedGroupsByView: nextState,
      };
    });
  },

  reset: () => {
    set({
      ownerId: undefined,
      isLoading: false,
      error: undefined,
      hasHydrated: false,
      viewsById: {},
      viewOrder: [],
      activeViewId: undefined,
      collapsedGroupsByView: {},
    });
  },
}));
