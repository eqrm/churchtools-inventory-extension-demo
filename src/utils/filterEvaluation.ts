/**
 * Filter evaluation utilities for multi-condition filters
 */
import type {
  Asset,
  FilterOperator,
  RelativeDateFilterValue,
  ViewFilter,
  ViewFilterGroup,
} from '../types/entities';
import { hasActiveFilters, isFilterGroup, normalizeFilterGroup } from './viewFilters';

type RelativeDateOperator = Extract<FilterOperator, 'relative-last' | 'relative-next'>;

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
      // Handle both comma-separated string and array formats
      let list: string[];
      if (Array.isArray(filterValue)) {
        list = filterValue.map(v => String(v).toLowerCase());
      } else {
        list = String(filterValue).split(',').map(v => v.trim().toLowerCase());
      }
      return list.includes(strValue);
    }
    
    case 'not-in': {
      // Handle both comma-separated string and array formats
      let list: string[];
      if (Array.isArray(filterValue)) {
        list = filterValue.map(v => String(v).toLowerCase());
      } else {
        list = String(filterValue).split(',').map(v => v.trim().toLowerCase());
      }
      return !list.includes(strValue);
    }

    case 'relative-last':
    case 'relative-next': {
      const candidateDate = toDate(value);
      if (!candidateDate) {
        return false;
      }
      const relativeValue = ensureRelativeFilterValue(filterValue, operator);
      const now = new Date();
      const { start, end } = getRelativeRange(now, relativeValue, operator);
      return candidateDate.getTime() >= start.getTime() && candidateDate.getTime() <= end.getTime();
    }
    
    default:
      return false;
  }
}

/**
 * Evaluate multi-condition filters with nested group logic
 */
export function evaluateFilters(item: Asset, group: ViewFilterGroup): boolean {
  if (!group || group.children.length === 0) {
    return true;
  }

  return evaluateGroup(item, group);
}

function evaluateGroup(item: Asset, group: ViewFilterGroup): boolean {
  if (group.children.length === 0) {
    return true;
  }

  const evaluator = group.logic === 'OR' ? 'some' : 'every';
  return group.children[evaluator]((node) => evaluateNode(item, node));
}

function evaluateNode(item: Asset, node: ViewFilter): boolean {
  if (isFilterGroup(node)) {
    return evaluateGroup(item, node);
  }
  return evaluateCondition(getFieldValue(item, node.field), node.operator, node.value);
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function ensureRelativeFilterValue(value: unknown, operator: RelativeDateOperator): RelativeDateFilterValue {
  if (
    value &&
    typeof value === 'object' &&
    'amount' in (value as Record<string, unknown>) &&
    'unit' in (value as Record<string, unknown>)
  ) {
    const input = value as Partial<RelativeDateFilterValue>;
    return {
      direction: operator === 'relative-last' ? 'last' : 'next',
      unit: (input.unit as RelativeDateFilterValue['unit']) ?? 'days',
      amount: Math.max(1, Number(input.amount) || 1),
    } satisfies RelativeDateFilterValue;
  }

  return {
    direction: operator === 'relative-last' ? 'last' : 'next',
    unit: 'days',
    amount: 7,
  } satisfies RelativeDateFilterValue;
}

function getRelativeRange(
  now: Date,
  relative: RelativeDateFilterValue,
  operator: RelativeDateOperator,
): { start: Date; end: Date } {
  const normalizedNow = new Date(now.getTime());
  const delta = operator === 'relative-last' ? -relative.amount : relative.amount;
  const offsetDate = addRelativeAmount(normalizedNow, delta, relative.unit);

  if (operator === 'relative-last') {
    return {
      start: offsetDate,
      end: normalizedNow,
    };
  }

  return {
    start: normalizedNow,
    end: offsetDate,
  };
}

function addRelativeAmount(base: Date, amount: number, unit: RelativeDateFilterValue['unit']): Date {
  const result = new Date(base.getTime());

  if (unit === 'days') {
    result.setUTCDate(result.getUTCDate() + amount);
    return result;
  }

  if (unit === 'weeks') {
    result.setUTCDate(result.getUTCDate() + amount * 7);
    return result;
  }

  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + amount);
  const daysInTargetMonth = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, daysInTargetMonth));
  return result;
}

/**
 * Apply filters to asset list
 */
export function applyFilters(assets: Asset[], filters?: ViewFilterGroup): Asset[] {
  if (!filters || !hasActiveFilters(filters)) {
    return assets;
  }

  const normalized = normalizeFilterGroup(filters);
  return assets.filter((asset) => evaluateFilters(asset, normalized));
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
