import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearUrlFilters,
  deserializeFiltersFromUrl,
  generateShareableLink,
  readFiltersFromUrl,
  serializeFiltersToUrl,
  updateUrlWithFilters,
} from '../../../src/utils/urlFilters';
import type { ViewFilterGroup } from '../../../src/types/entities';
import { countFilterConditions } from '../../../src/utils/viewFilters';

const sampleFilters: ViewFilterGroup = {
  id: 'root',
  type: 'group',
  logic: 'AND',
  children: [
    {
      id: 'condition-1',
      type: 'condition',
      field: 'status',
      operator: 'equals',
      value: 'available',
    },
  ],
};

describe('urlFilters utilities', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/assets');
  });

  it('serializes and deserializes active filters', () => {
    const encoded = serializeFiltersToUrl(sampleFilters);
    expect(encoded).toBeTruthy();

    const decoded = deserializeFiltersFromUrl(encoded);
    expect(decoded).toBeDefined();
    expect(countFilterConditions(decoded!)).toBe(1);
  });

  it('updates the URL search params with filter state', () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState');

    updateUrlWithFilters(sampleFilters, 'gallery', 'name', 'desc', 'status');

    expect(replaceSpy).toHaveBeenCalled();
    const params = new URLSearchParams(window.location.search);
    expect(params.get('view')).toBe('gallery');
    expect(params.get('sortBy')).toBe('name');
    expect(params.get('sortDir')).toBe('desc');
    expect(params.get('groupBy')).toBe('status');

    const { filters } = readFiltersFromUrl();
    expect(filters).toBeDefined();
    expect(countFilterConditions(filters!)).toBe(1);

    replaceSpy.mockRestore();
  });

  it('clears url filters and creates shareable links', () => {
    updateUrlWithFilters(sampleFilters, 'table');
    expect(window.location.search).not.toBe('');

    clearUrlFilters();
    expect(window.location.search).toBe('');

    const shareable = generateShareableLink(sampleFilters, 'table');
    expect(shareable).toContain('filters=');
  });
});
