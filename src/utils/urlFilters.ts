/**
 * URL filter persistence utilities
 * Enables shareable filter links by encoding filters in URL query params
 */
import type { LegacyViewFilter, ViewFilterGroup, ViewMode } from '../types/entities';
import {
  convertLegacyFiltersToGroup,
  hasActiveFilters,
  normalizeFilterGroup,
} from './viewFilters';

/**
 * Serialize filters to URL query string
 */
export function serializeFiltersToUrl(filters?: ViewFilterGroup): string {
  if (!filters || !hasActiveFilters(filters)) return '';
  
  try {
    const normalized = normalizeFilterGroup(filters);
    const encoded = btoa(JSON.stringify(normalized));
    return encoded;
  } catch (error) {
    console.error('Failed to serialize filters:', error);
    return '';
  }
}

/**
 * Deserialize filters from URL query string
 */
export function deserializeFiltersFromUrl(encoded: string): ViewFilterGroup | undefined {
  if (!encoded) return undefined;
  
  try {
    const decoded = atob(encoded);
    const data = JSON.parse(decoded) as unknown;

    if (Array.isArray(data)) {
      return convertLegacyFiltersToGroup(data as LegacyViewFilter[]);
    }

    if (data && typeof data === 'object') {
      return normalizeFilterGroup(data as ViewFilterGroup);
    }

    return undefined;
  } catch (error) {
    console.error('Failed to deserialize filters:', error);
    return undefined;
  }
}

/**
 * Update URL with current filter state
 */
export function updateUrlWithFilters(
  filters: ViewFilterGroup | undefined,
  viewMode?: ViewMode,
  sortBy?: string,
  sortDirection?: 'asc' | 'desc',
  groupBy?: string,
  quickFilters?: ViewFilterGroup,
): void {
  const params = new URLSearchParams(window.location.search);
  
  // Update filters
  if (filters && hasActiveFilters(filters)) {
    params.set('filters', serializeFiltersToUrl(filters));
  } else {
    params.delete('filters');
  }
  
  // Update view mode
  if (viewMode) {
    params.set('view', viewMode);
  }
  
  // Update sort
  if (sortBy) {
    params.set('sortBy', sortBy);
    if (sortDirection) {
      params.set('sortDir', sortDirection);
    }
  }
  
  // Update grouping
  if (groupBy) {
    params.set('groupBy', groupBy);
  } else {
    params.delete('groupBy');
  }

  if (quickFilters && hasActiveFilters(quickFilters)) {
    params.set('quickFilters', serializeFiltersToUrl(quickFilters));
  } else {
    params.delete('quickFilters');
  }
  
  // Update URL without reload
  const nextSearch = params.toString();
  const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (nextUrl === currentUrl) {
    return;
  }

  window.history.replaceState({}, '', nextUrl);
}

/**
 * Read filters from current URL
 */
export function readFiltersFromUrl(): {
  filters?: ViewFilterGroup;
  viewMode?: ViewMode;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  groupBy?: string;
  quickFilters?: ViewFilterGroup;
} {
  const params = new URLSearchParams(window.location.search);
  
  return {
    filters: deserializeFiltersFromUrl(params.get('filters') || ''),
    viewMode: (params.get('view') as ViewMode) || undefined,
    sortBy: params.get('sortBy') || undefined,
    sortDirection: (params.get('sortDir') as 'asc' | 'desc') || undefined,
    groupBy: params.get('groupBy') || undefined,
    quickFilters: deserializeFiltersFromUrl(params.get('quickFilters') || ''),
  };
}

/**
 * Generate shareable link with current filters
 */
export function generateShareableLink(
  filters: ViewFilterGroup | undefined,
  viewMode?: ViewMode,
  sortBy?: string,
  sortDirection?: 'asc' | 'desc',
  groupBy?: string,
  quickFilters?: ViewFilterGroup,
): string {
  const params = new URLSearchParams();
  
  if (filters && hasActiveFilters(filters)) {
    params.set('filters', serializeFiltersToUrl(filters));
  }
  
  if (viewMode) {
    params.set('view', viewMode);
  }
  
  if (sortBy) {
    params.set('sortBy', sortBy);
    if (sortDirection) {
      params.set('sortDir', sortDirection);
    }
  }
  
  if (groupBy) {
    params.set('groupBy', groupBy);
  }

  if (quickFilters && hasActiveFilters(quickFilters)) {
    params.set('quickFilters', serializeFiltersToUrl(quickFilters));
  }
  
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
}

/**
 * Clear all filters from URL
 */
export function clearUrlFilters(): void {
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  const nextUrl = window.location.pathname;

  if (currentUrl === nextUrl) {
    return;
  }

  window.history.replaceState({}, '', nextUrl);
}
