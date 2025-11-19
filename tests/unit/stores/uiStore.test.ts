import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '../../../src/stores/uiStore';
import { createFilterCondition, createFilterGroup } from '../../../src/utils/viewFilters';
import type { ViewFilterGroup } from '../../../src/types/entities';

const resetViewFilters = () => {
  useUIStore.setState((state) => ({
    ...state,
    viewFilters: createFilterGroup('AND'),
  }));
};

describe('useUIStore viewFilters', () => {
  beforeEach(() => {
    resetViewFilters();
  });

  it('normalizes view filter groups on set', () => {
    const rawGroup: ViewFilterGroup = {
      id: 'root-group',
      type: 'group',
      logic: 'AND',
      children: [
        {
          id: 'condition-without-type',
          field: 'name',
          operator: 'contains',
          value: 'amp',
        },
      ],
    };

    useUIStore.getState().setViewFilters(rawGroup);

    const stored = useUIStore.getState().viewFilters;
    expect(stored.children).toHaveLength(1);
    expect(typeof stored.children[0]?.id).toBe('string');
    expect(stored.children[0]?.type).toBe('condition');
  });

  it('clears filters back to an empty AND group', () => {
    const populated = createFilterGroup('OR', [createFilterCondition({ field: 'status', value: 'available' })]);
    useUIStore.getState().setViewFilters(populated);

    useUIStore.getState().clearViewFilters();

    const cleared = useUIStore.getState().viewFilters;
    expect(cleared.children).toHaveLength(0);
    expect(cleared.logic).toBe('AND');
  });
});
