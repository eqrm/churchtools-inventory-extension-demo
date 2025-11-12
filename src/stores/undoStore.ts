import { create } from 'zustand';
import type { UndoAction } from '../types/undo';

interface UndoStoreState {
  actions: UndoAction[];
  isLoading: boolean;
  undoingActionId?: string;
  error?: string;
  setActions: (actions: UndoAction[]) => void;
  upsertAction: (action: UndoAction) => void;
  markReverted: (actionId: string) => void;
  removeAction: (actionId: string) => void;
  clear: () => void;
  setLoading: (value: boolean) => void;
  setUndoing: (actionId?: string) => void;
  setError: (message?: string) => void;
}

const sortByCreatedAtDesc = (lhs: UndoAction, rhs: UndoAction): number => {
  return new Date(rhs.createdAt).getTime() - new Date(lhs.createdAt).getTime();
};

export const useUndoStore = create<UndoStoreState>((set) => ({
  actions: [],
  isLoading: false,
  undoingActionId: undefined,
  error: undefined,

  setActions: (actions) => {
    set({ actions: [...actions].sort(sortByCreatedAtDesc).slice(0, 50) });
  },

  upsertAction: (action) => {
    set((state) => {
      const next = [...state.actions];
      const index = next.findIndex((item) => item.actionId === action.actionId);

      if (index >= 0) {
        next[index] = action;
      } else {
        next.push(action);
      }

      next.sort(sortByCreatedAtDesc);

      return {
        actions: next.slice(0, 50),
      };
    });
  },

  markReverted: (actionId) => {
    set((state) => ({
      actions: state.actions.map((action) =>
        action.actionId === actionId ? { ...action, undoStatus: 'reverted' } : action,
      ),
    }));
  },

  removeAction: (actionId) => {
    set((state) => ({
      actions: state.actions.filter((action) => action.actionId !== actionId),
    }));
  },

  clear: () => set({ actions: [] }),

  setLoading: (value) => set({ isLoading: value }),

  setUndoing: (actionId) => set({ undoingActionId: actionId }),

  setError: (message) => set({ error: message }),
}));
