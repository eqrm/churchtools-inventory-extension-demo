import { describe, expect, it, beforeEach } from 'vitest';
import { serializeFiltersToUrl, deserializeFiltersFromUrl, readFiltersFromUrl } from '../../utils/urlFilters';
import { createFilterCondition, createFilterGroup, countFilterConditions } from '../../utils/viewFilters';

describe('urlFilters quick filter support', () => {
  const quickFilterGroup = createFilterGroup('AND', [
    createFilterCondition({ field: 'name', operator: 'contains', value: 'camera' }),
  ]);

  beforeEach(() => {
    window.history.replaceState({}, '', 'http://localhost/');
  });

  it('round-trips filter groups through serialization helpers', () => {
    const encoded = serializeFiltersToUrl(quickFilterGroup);
    const decoded = deserializeFiltersFromUrl(encoded);

    expect(decoded).toBeDefined();
    if (decoded) {
      expect(countFilterConditions(decoded)).toBe(1);
      expect(decoded.children[0]).toMatchObject({ field: 'name', value: 'camera' });
    }
  });

  it('parses quick filters from the query string', () => {
    const encodedQuick = serializeFiltersToUrl(quickFilterGroup);
    window.history.replaceState({}, '', `http://localhost/?quickFilters=${encodedQuick}`);

    const state = readFiltersFromUrl();
    expect(state.quickFilters).toBeDefined();
    if (state.quickFilters) {
      expect(countFilterConditions(state.quickFilters)).toBe(1);
    }
  });
});
