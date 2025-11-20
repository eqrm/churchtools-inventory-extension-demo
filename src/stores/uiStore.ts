import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { AssetFilters, ViewMode, ViewFilterGroup } from '../types/entities';
import { createFilterGroup, normalizeFilterGroup } from '../utils/viewFilters';

const inMemoryStorage: StateStorage = (() => {
    const store = new Map<string, string>();
    return {
        getItem: (name) => store.get(name) ?? null,
        setItem: (name, value) => {
            store.set(name, value);
        },
        removeItem: (name) => {
            store.delete(name);
        },
    };
})();

const uiStateStorage = createJSONStorage(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
    }
    return inMemoryStorage;
});

/**
 * UI State Store (T213 - Enhanced with view preferences)
 * Manages global UI state (theme, sidebar, modals, filters, view preferences, etc.)
 */
interface UIState {
    // Sidebar
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    
    // Theme
    colorScheme: 'light' | 'dark' | 'auto';
    setColorScheme: (scheme: 'light' | 'dark' | 'auto') => void;
    
    // Modals
    activeModal: string | null;
    modalData: Record<string, unknown> | null;
    openModal: (modalId: string, data?: Record<string, unknown> | null) => void;
    closeModal: () => void;
    
    // Loading states
    globalLoading: boolean;
    setGlobalLoading: (loading: boolean) => void;
    
    // Asset Filters (User Story 1)
    assetFilters: AssetFilters;
    setAssetFilters: (filters: AssetFilters) => void;
    clearAssetFilters: () => void;
    updateAssetFilter: <K extends keyof AssetFilters>(key: K, value: AssetFilters[K]) => void;
    
    // View Preferences (T213 - Phase 11)
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    
    viewFilters: ViewFilterGroup;
    setViewFilters: (filters: ViewFilterGroup) => void;
    clearViewFilters: () => void;

    quickFilters: ViewFilterGroup;
    setQuickFilters: (filters: ViewFilterGroup) => void;
    clearQuickFilters: () => void;
    
    sortBy: string | null;
    setSortBy: (field: string | null) => void;
    
    sortDirection: 'asc' | 'desc';
    setSortDirection: (direction: 'asc' | 'desc') => void;
    
    groupBy: string | null;
    setGroupBy: (field: string | null) => void;
    
    // Legacy view mode (kept for backward compatibility)
    assetViewMode: 'table' | 'gallery';
    setAssetViewMode: (mode: 'table' | 'gallery') => void;
    
    // Notifications
    showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            // Sidebar
            sidebarCollapsed: false,
            toggleSidebar: () => {
                set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
            },
            setSidebarCollapsed: (collapsed) => {
                set({ sidebarCollapsed: collapsed });
            },
            
            // Theme
            colorScheme: 'auto',
            setColorScheme: (scheme) => {
                set({ colorScheme: scheme });
            },
            
            // Modals
            activeModal: null,
            modalData: null,
            openModal: (modalId, data = null) => {
                set({ activeModal: modalId, modalData: data });
            },
            closeModal: () => {
                set({ activeModal: null, modalData: null });
            },
            
            // Loading states
            globalLoading: false,
            setGlobalLoading: (loading) => {
                set({ globalLoading: loading });
            },
            
            // Asset Filters
            assetFilters: {},
            setAssetFilters: (filters) => {
                set({ assetFilters: filters });
            },
            clearAssetFilters: () => {
                set({ assetFilters: {} });
            },
            updateAssetFilter: (key, value) => {
                set((state) => ({
                    assetFilters: { ...state.assetFilters, [key]: value },
                }));
            },
            
            // View Preferences (T213)
            viewMode: 'table',
            setViewMode: (mode) => {
                set({ viewMode: mode });
            },
            
            viewFilters: createFilterGroup('AND'),
            setViewFilters: (filters) => {
                set({ viewFilters: normalizeFilterGroup(filters) });
            },
            clearViewFilters: () => {
                set({ viewFilters: createFilterGroup('AND') });
            },

            quickFilters: createFilterGroup('AND'),
            setQuickFilters: (filters) => {
                set({ quickFilters: normalizeFilterGroup(filters) });
            },
            clearQuickFilters: () => {
                set({ quickFilters: createFilterGroup('AND') });
            },
            
            sortBy: null,
            setSortBy: (field) => {
                set({ sortBy: field });
            },
            
            sortDirection: 'asc',
            setSortDirection: (direction) => {
                set({ sortDirection: direction });
            },
            
            groupBy: null,
            setGroupBy: (field) => {
                set({ groupBy: field });
            },
            
            // Legacy view mode (kept for backward compatibility)
            assetViewMode: 'table',
            setAssetViewMode: (mode) => {
                set({ assetViewMode: mode });
            },
            
            // Notifications (placeholder - will use Mantine notifications)
            showNotification: () => {
                // Implementation will use Mantine's notifications in components
            },
        }),
        {
            name: 'churchtools-inventory-ui',
            version: 2,
            storage: uiStateStorage,
            merge: (persistedState, currentState) => {
                if (!persistedState || typeof persistedState !== 'object') {
                    return currentState;
                }
                const nextState = {
                    ...currentState,
                    ...(persistedState as Partial<UIState>),
                };
                if (nextState.viewFilters) {
                    nextState.viewFilters = normalizeFilterGroup(nextState.viewFilters);
                }
                if (nextState.quickFilters) {
                    nextState.quickFilters = normalizeFilterGroup(nextState.quickFilters);
                } else {
                    nextState.quickFilters = createFilterGroup('AND');
                }
                return nextState;
            },
            partialize: (state) => ({
                sidebarCollapsed: state.sidebarCollapsed,
                colorScheme: state.colorScheme,
                assetFilters: state.assetFilters,
                assetViewMode: state.assetViewMode,
                // T213: Persist view preferences
                viewMode: state.viewMode,
                viewFilters: state.viewFilters,
                quickFilters: state.quickFilters,
                sortBy: state.sortBy,
                sortDirection: state.sortDirection,
                groupBy: state.groupBy,
            }),
        }
    )
);

