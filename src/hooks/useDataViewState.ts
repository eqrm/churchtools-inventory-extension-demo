import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataViewMode } from '../components/dataView/types';

function cloneFilters<T>(value: T): T {
    if (value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(item => cloneFilters(item)) as unknown as T;
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [
            key,
            cloneFilters(val),
        ]);
        return Object.fromEntries(entries) as T;
    }

    return value;
}

export interface UseDataViewStateOptions<TFilters, TSort> {
    storageKey: string;
    initialFilters?: TFilters;
    initialFiltersKey?: string;
    defaultMode?: DataViewMode;
    initialSort?: TSort;
    defaultPageSize?: number;
    pageSizeOptions?: number[];
    pageSizeStorageKey?: string;
    getActiveFilterCount?: (filters: TFilters) => number;
}

export interface UseDataViewStateResult<TFilters, TSort> {
    viewMode: DataViewMode;
    setViewMode: (mode: DataViewMode) => void;
    filters: TFilters;
    setFilters: React.Dispatch<React.SetStateAction<TFilters>>;
    resetFilters: () => void;
    hasActiveFilters: boolean;
    activeFilterCount: number;
    sortStatus: TSort;
    setSortStatus: (status: TSort) => void;
    page: number;
    setPage: (page: number) => void;
    pageSize: number;
    setPageSize: (pageSize: number) => void;
    pageSizeOptions: number[];
}

export function useDataViewState<TFilters extends Record<string, unknown>, TSort = undefined>(
    options: UseDataViewStateOptions<TFilters, TSort>,
): UseDataViewStateResult<TFilters, TSort> {
    const {
        storageKey,
        initialFilters,
        initialFiltersKey,
        defaultMode = 'table',
        initialSort,
        defaultPageSize = 25,
        pageSizeOptions = [25, 50, 100, 200],
        pageSizeStorageKey,
        getActiveFilterCount,
    } = options;

    const viewModeStorageKey = `${storageKey}:mode`;
    const resolvedPageSizeStorageKey = pageSizeStorageKey ?? `${storageKey}:page-size`;

    const initialFiltersRef = useRef<TFilters>(cloneFilters(initialFilters ?? ({} as TFilters)));
    const [filters, setFilters] = useState<TFilters>(() => cloneFilters(initialFiltersRef.current));

    useEffect(() => {
        if (initialFiltersKey === undefined) {
            return;
        }
        const nextInitial = cloneFilters(initialFilters ?? ({} as TFilters));
        initialFiltersRef.current = nextInitial;
        setFilters(cloneFilters(nextInitial));
    }, [initialFiltersKey, initialFilters]);

    const [viewMode, setViewModeState] = useState<DataViewMode>(() => {
        if (typeof window === 'undefined') {
            return defaultMode;
        }
        const stored = window.localStorage.getItem(viewModeStorageKey);
        if (stored === 'table' || stored === 'gallery' || stored === 'kanban' || stored === 'calendar') {
            return stored;
        }
        return defaultMode;
    });

    const setViewMode = useCallback((mode: DataViewMode) => {
        setViewModeState(mode);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(viewModeStorageKey, mode);
        }
    }, [viewModeStorageKey]);

    const [pageSize, setPageSizeState] = useState<number>(() => {
        if (typeof window === 'undefined') {
            return defaultPageSize;
        }
        const stored = window.localStorage.getItem(resolvedPageSizeStorageKey);
        const parsed = stored ? Number.parseInt(stored, 10) : NaN;
        return Number.isFinite(parsed) && pageSizeOptions.includes(parsed) ? parsed : defaultPageSize;
    });

    const setPageSize = useCallback((size: number) => {
        setPageSizeState(size);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(resolvedPageSizeStorageKey, String(size));
        }
    }, [resolvedPageSizeStorageKey]);

    const [page, setPage] = useState(1);
    const [sortStatus, setSortStatusState] = useState<TSort>(initialSort as TSort);

    const activeFilterCount = useMemo(() => {
        if (typeof getActiveFilterCount === 'function') {
            return getActiveFilterCount(filters);
        }

        const baseline = initialFiltersRef.current;
        const currentSerialized = JSON.stringify(filters ?? {});
        const baselineSerialized = JSON.stringify(baseline ?? {});
        return currentSerialized === baselineSerialized ? 0 : 1;
    }, [filters, getActiveFilterCount]);

    const hasActiveFilters = activeFilterCount > 0;

    const resetFilters = useCallback(() => {
        setFilters(cloneFilters(initialFiltersRef.current));
    }, []);

    const setSortStatus = useCallback((status: TSort) => {
        setSortStatusState(status);
    }, []);

    return {
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
    };
}
