import { create } from 'zustand';

export interface UndoAction {
  label: string;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
  metadata?: Record<string, unknown>;
}

interface UndoState {
  past: UndoAction[];
  future: UndoAction[];
  push: (action: UndoAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY = 20;

export const useUndoStore = create<UndoState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  push: (action) => {
    set((state) => {
      const newPast = [...state.past, action].slice(-MAX_HISTORY);
      return {
        past: newPast,
        future: [], // Clear future on new action
        canUndo: true,
        canRedo: false,
      };
    });
  },

  undo: async () => {
    const { past, future } = get();
    if (past.length === 0) return;

    const action = past[past.length - 1];
    if (!action) return; // Should not happen given length check

    const newPast = past.slice(0, -1);

    try {
      await action.undo();
      set({
        past: newPast,
        future: [action, ...future],
        canUndo: newPast.length > 0,
        canRedo: true,
      });
    } catch (error) {
      console.error('Undo failed:', error);
    }
  },

  redo: async () => {
    const { past, future } = get();
    if (future.length === 0) return;

    const action = future[0];
    if (!action) return; // Should not happen given length check

    const newFuture = future.slice(1);

    try {
      await action.redo();
      set({
        past: [...past, action],
        future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0,
      });
    } catch (error) {
      console.error('Redo failed:', error);
    }
  },

  clear: () => {
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },
}));
