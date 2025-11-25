/**
 * URL filter persistence utilities
 * Enables shareable filter links by encoding filters in URL query params
 */
import type { ViewFilter, ViewMode } from '../types/entities';

/**
 * Serialize filters to URL query string
 */
export function serializeFiltersToUrl(filters: ViewFilter[]): string {
  if (filters.length === 0) return '';
  
  try {
    const encoded = btoa(JSON.stringify(filters));
    return encoded;
  } catch (error) {
    console.error('Failed to serialize filters:', error);
    return '';
  }
}

/**
 * Deserialize filters from URL query string
 */
export function deserializeFiltersFromUrl(encoded: string): ViewFilter[] {
  if (!encoded) return [];
  
  try {
    const decoded = atob(encoded);
    const filters = JSON.parse(decoded) as ViewFilter[];
    
    // Validate filter structure
    if (!Array.isArray(filters)) return [];
    
    return filters.filter(f => 
      f &&
      typeof f.field === 'string' &&
      typeof f.operator === 'string' &&
      (f.logic === undefined || f.logic === 'AND' || f.logic === 'OR')
    );
  } catch (error) {
    console.error('Failed to deserialize filters:', error);
    return [];
  }
}

/**
 * Update URL with current filter state
 */
export function updateUrlWithFilters(
  filters: ViewFilter[],
  viewMode?: ViewMode,
  sortBy?: string,
  sortDirection?: 'asc' | 'desc',
  groupBy?: string
): void {
  const params = new URLSearchParams(window.location.search);
  
  // Update filters
  if (filters.length > 0) {
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
  filters: ViewFilter[];
  viewMode?: ViewMode;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  groupBy?: string;
} {
  const params = new URLSearchParams(window.location.search);
  
  return {
    filters: deserializeFiltersFromUrl(params.get('filters') || ''),
    viewMode: (params.get('view') as ViewMode) || undefined,
    sortBy: params.get('sortBy') || undefined,
    sortDirection: (params.get('sortDir') as 'asc' | 'desc') || undefined,
    groupBy: params.get('groupBy') || undefined,
  };
}

/**
 * Generate shareable link with current filters
 */
export function generateShareableLink(
  filters: ViewFilter[],
  viewMode?: ViewMode,
  sortBy?: string,
  sortDirection?: 'asc' | 'desc',
  groupBy?: string
): string {
  const params = new URLSearchParams();
  
  if (filters.length > 0) {
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
