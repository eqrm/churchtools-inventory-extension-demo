import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUndoStore } from '../../state/undoStore';

describe('undoStore', () => {
  beforeEach(() => {
    useUndoStore.getState().clear();
  });

  it('starts empty', () => {
    const state = useUndoStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
  });

  it('pushes actions', () => {
    const action = {
      label: 'Test Action',
      undo: vi.fn(),
      redo: vi.fn(),
    };

    useUndoStore.getState().push(action);

    const state = useUndoStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.past[0]).toBe(action);
    expect(state.canUndo).toBe(true);
    expect(state.canRedo).toBe(false);
  });

  it('clears future on push', async () => {
    const action1 = { label: '1', undo: vi.fn(), redo: vi.fn() };
    const action2 = { label: '2', undo: vi.fn(), redo: vi.fn() };

    useUndoStore.getState().push(action1);
    await useUndoStore.getState().undo();

    expect(useUndoStore.getState().future).toHaveLength(1);

    useUndoStore.getState().push(action2);

    const state = useUndoStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.past[0]).toBe(action2);
    expect(state.future).toHaveLength(0);
  });

  it('undoes actions', async () => {
    const undo = vi.fn();
    const action = { label: 'Test', undo, redo: vi.fn() };

    useUndoStore.getState().push(action);
    await useUndoStore.getState().undo();

    expect(undo).toHaveBeenCalled();
    const state = useUndoStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(1);
    expect(state.future[0]).toBe(action);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(true);
  });

  it('redoes actions', async () => {
    const redo = vi.fn();
    const action = { label: 'Test', undo: vi.fn(), redo };

    useUndoStore.getState().push(action);
    await useUndoStore.getState().undo();
    await useUndoStore.getState().redo();

    expect(redo).toHaveBeenCalled();
    const state = useUndoStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.future).toHaveLength(0);
    expect(state.canUndo).toBe(true);
    expect(state.canRedo).toBe(false);
  });

  it('respects max history limit', () => {
    for (let i = 0; i < 25; i++) {
      useUndoStore.getState().push({
        label: `Action ${i}`,
        undo: vi.fn(),
        redo: vi.fn(),
      });
    }

    const state = useUndoStore.getState();
    expect(state.past).toHaveLength(20);
    expect(state.past[0].label).toBe('Action 5');
    expect(state.past[19].label).toBe('Action 24');
  });

  it('handles async actions', async () => {
    const undo = vi.fn().mockResolvedValue(undefined);
    const redo = vi.fn().mockResolvedValue(undefined);
    const action = { label: 'Async', undo, redo };

    useUndoStore.getState().push(action);
    await useUndoStore.getState().undo();
    expect(undo).toHaveBeenCalled();

    await useUndoStore.getState().redo();
    expect(redo).toHaveBeenCalled();
  });
});
