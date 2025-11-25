import { beforeEach, describe, expect, it } from 'vitest';
import { useUndoStore } from '../../stores/undoStore';
import type { UndoAction } from '../../types/undo';
import { MAX_UNDO_HISTORY } from '../../constants/undo';

const BASE_TIME = new Date('2025-01-01T00:00:00.000Z').getTime();
const ONE_MINUTE = 60 * 1000;

function createAction(index: number, overrides: Partial<UndoAction> = {}): UndoAction {
  const timestamp = new Date(BASE_TIME + index * ONE_MINUTE).toISOString();
  return {
    actionId: `action-${index}`,
    actorId: 'user-123',
    actorName: 'Test User',
    entityType: 'asset',
    entityId: `asset-${index}`,
    actionType: 'update',
    beforeState: null,
    afterState: { version: index },
    createdAt: timestamp,
    expiresAt: new Date(BASE_TIME + (index + 60) * ONE_MINUTE).toISOString(),
    undoStatus: 'pending',
    ...overrides,
  };
}

describe('undoStore', () => {
  beforeEach(() => {
    useUndoStore.getState().clear();
  });

  it('keeps only the most recent actions when setting state', () => {
    const actions = Array.from({ length: 30 }, (_, index) => createAction(index));

    useUndoStore.getState().setActions(actions);

    const stored = useUndoStore.getState().actions;
    expect(stored).toHaveLength(MAX_UNDO_HISTORY);
    expect(stored[0]?.actionId).toBe('action-29');
    expect(stored.at(-1)?.actionId).toBe(`action-${30 - MAX_UNDO_HISTORY}`);
  });

  it('upserts new actions while respecting the global limit', () => {
    const initial = Array.from({ length: MAX_UNDO_HISTORY }, (_, index) => createAction(index));
    const store = useUndoStore.getState();

    store.setActions(initial);
    store.upsertAction(createAction(99));

    const stored = useUndoStore.getState().actions;
    expect(stored).toHaveLength(MAX_UNDO_HISTORY);
    expect(stored[0]?.actionId).toBe('action-99');
    expect(stored.at(-1)?.actionId).toBe('action-1');
  });
});
