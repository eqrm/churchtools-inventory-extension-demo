import { describe, expect, it } from 'vitest';
import {
  convertLegacyFiltersToGroup,
  countFilterConditions,
  createFilterCondition,
  createFilterGroup,
  flattenFilterConditions,
  hasActiveFilters,
  normalizeFilterGroup,
  cloneFilterGroup,
} from '../../../src/utils/viewFilters';
import type { LegacyViewFilter, ViewFilterCondition, ViewFilterGroup } from '../../../src/types/entities';

function buildGroup(children: ViewFilterGroup['children']): ViewFilterGroup {
  return {
    id: 'group-root',
    type: 'group',
    logic: 'AND',
    children,
  };
}

describe('viewFilters utilities', () => {
  it('normalizes standalone conditions into a root group', () => {
    const singleCondition: ViewFilterCondition = {
      id: 'condition-1',
      type: 'condition',
      field: 'status',
      operator: 'equals',
      value: 'available',
    };

    const normalized = normalizeFilterGroup(singleCondition);
    expect(normalized.logic).toBe('AND');
    expect(normalized.children).toHaveLength(1);
    expect((normalized.children[0] as ViewFilterCondition).field).toBe('status');
  });

  it('counts nested filter conditions', () => {
    const group = buildGroup([
      createFilterCondition({ id: 'cond-1', field: 'status', operator: 'equals', value: 'available' }),
      createFilterGroup('OR', [
        createFilterCondition({ id: 'cond-2', field: 'location', operator: 'equals', value: 'Berlin' }),
        createFilterCondition({ id: 'cond-3', field: 'name', operator: 'contains', value: 'Camera' }),
      ]),
    ]);

    expect(countFilterConditions(group)).toBe(3);
  });

  it('flattens nested children in depth-first order', () => {
    const innerGroup = createFilterGroup('AND', [
      createFilterCondition({ id: 'cond-2', field: 'location', operator: 'equals', value: 'Berlin' }),
    ]);
    const group = buildGroup([
      createFilterCondition({ id: 'cond-1', field: 'status', operator: 'equals', value: 'available' }),
      innerGroup,
    ]);

    const flattened = flattenFilterConditions(group);
    expect(flattened.map((condition) => condition.id)).toEqual(['cond-1', 'cond-2']);
  });

  it('converts legacy arrays into nested groups honoring logic connectors', () => {
    const legacyFilters: LegacyViewFilter[] = [
      { field: 'status', operator: 'equals', value: 'available', logic: 'OR' },
      { field: 'location', operator: 'equals', value: 'Berlin' },
    ];

    const result = convertLegacyFiltersToGroup(legacyFilters);
    expect(result.logic).toBe('OR');
    expect(countFilterConditions(result)).toBe(2);
  });

  it('detects when no active filters exist', () => {
    const emptyGroup = createFilterGroup('AND');
    expect(hasActiveFilters(emptyGroup)).toBe(false);
    expect(hasActiveFilters()).toBe(false);
  });

  it('produces deep clones when duplicating groups', () => {
    const group = buildGroup([
      createFilterCondition({ id: 'cond-1', field: 'status', operator: 'equals', value: 'available' }),
    ]);

    const cloned = cloneFilterGroup(group);
    expect(cloned).not.toBe(group);
    expect(cloned.children[0]).not.toBe(group.children[0]);
    expect(flattenFilterConditions(cloned).map((condition) => condition.id)).toEqual(['cond-1']);
  });
});
