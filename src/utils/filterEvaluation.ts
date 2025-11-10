/**
 * Filter evaluation utilities for multi-condition filters
 */
import type { ViewFilter, FilterOperator, Asset } from '../types/entities';

/**
 * Get nested field value from object using dot notation
 * @example getFieldValue(asset, 'category.name') returns asset.assetType.name
 */
export function getFieldValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  
  const keys = path.split('.');
  let value: unknown = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Evaluate a single filter condition
 */
export function evaluateCondition(
  value: unknown,
  operator: FilterOperator,
  filterValue: unknown
): boolean {
  // Handle empty operators
  if (operator === 'is-empty') {
    return value === null || value === undefined || value === '';
  }
  
  if (operator === 'is-not-empty') {
    return value !== null && value !== undefined && value !== '';
  }

  // Convert to strings for comparison
  const strValue = String(value ?? '').toLowerCase();
  const strFilterValue = String(filterValue ?? '').toLowerCase();

  switch (operator) {
    case 'equals':
      return strValue === strFilterValue;
    
    case 'not-equals':
      return strValue !== strFilterValue;
    
    case 'contains':
      return strValue.includes(strFilterValue);
    
    case 'not-contains':
      return !strValue.includes(strFilterValue);
    
    case 'starts-with':
      return strValue.startsWith(strFilterValue);
    
    case 'ends-with':
      return strValue.endsWith(strFilterValue);
    
    case 'greater-than': {
      const numValue = Number(value);
      const numFilterValue = Number(filterValue);
      return !isNaN(numValue) && !isNaN(numFilterValue) && numValue > numFilterValue;
    }
    
    case 'less-than': {
      const numValue = Number(value);
      const numFilterValue = Number(filterValue);
      return !isNaN(numValue) && !isNaN(numFilterValue) && numValue < numFilterValue;
    }
    
    case 'in': {
      // Expect filterValue to be comma-separated list
      const list = String(filterValue).split(',').map(v => v.trim().toLowerCase());
      return list.includes(strValue);
    }
    
    case 'not-in': {
      const list = String(filterValue).split(',').map(v => v.trim().toLowerCase());
      return !list.includes(strValue);
    }
    
    default:
      return false;
  }
}

/**
 * Evaluate multi-condition filters with AND/OR logic
 */
export function evaluateFilters(item: Asset, filters: ViewFilter[]): boolean {
  if (filters.length === 0) return true;

  let result = true;
  let currentLogic: 'AND' | 'OR' = 'AND';

  for (let i = 0; i < filters.length; i++) {
    const filter = filters[i];
    if (!filter) continue;
    
    const fieldValue = getFieldValue(item, filter.field);
    const conditionResult = evaluateCondition(fieldValue, filter.operator, filter.value);

    if (i === 0) {
      result = conditionResult;
    } else {
      if (currentLogic === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }

    // Update logic for next iteration
    currentLogic = filter.logic || 'AND';
  }

  return result;
}

/**
 * Apply filters to asset list
 */
export function applyFilters(assets: Asset[], filters: ViewFilter[]): Asset[] {
  if (filters.length === 0) return assets;
  return assets.filter(asset => evaluateFilters(asset, filters));
}

/**
 * Group assets by field value
 */
export function groupAssets(
  assets: Asset[],
  groupByField: string
): Record<string, Asset[]> {
  const groups: Record<string, Asset[]> = {};

  for (const asset of assets) {
    const value = getFieldValue(asset, groupByField);
    const key = String(value ?? 'Ungrouped');

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(asset);
  }

  return groups;
}

/**
 * Sort assets by field
 */
export function sortAssets(
  assets: Asset[],
  sortBy: string,
  sortDirection: 'asc' | 'desc' = 'asc'
): Asset[] {
  return [...assets].sort((a, b) => {
    const aValue = getFieldValue(a, sortBy);
    const bValue = getFieldValue(b, sortBy);

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
    if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

    // Compare as strings
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}
