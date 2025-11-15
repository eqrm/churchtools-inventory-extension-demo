import { create } from 'zustand';
import type { Assignment, AssignmentHistoryEntry } from '../types/assignment';

interface AssignmentStoreState {
  currentByAsset: Record<string, Assignment | null>;
  historyByAsset: Record<string, AssignmentHistoryEntry[]>;
  assignmentsByUser: Record<string, Assignment[]>;
  setCurrent: (assetId: string, assignment: Assignment | null) => void;
  setHistory: (assetId: string, history: AssignmentHistoryEntry[]) => void;
  upsertHistoryEntry: (assetId: string, entry: AssignmentHistoryEntry) => void;
  setAssignmentsForUser: (userId: string, assignments: Assignment[]) => void;
  clear: () => void;
}

function sortHistory(entries: AssignmentHistoryEntry[]): AssignmentHistoryEntry[] {
  return [...entries].sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
}

export const useAssignmentStore = create<AssignmentStoreState>((set) => ({
  currentByAsset: {},
  historyByAsset: {},
  assignmentsByUser: {},

  setCurrent: (assetId, assignment) => {
    set((state) => ({
      currentByAsset: {
        ...state.currentByAsset,
        [assetId]: assignment,
      },
    }));
  },

  setHistory: (assetId, history) => {
    set((state) => ({
      historyByAsset: {
        ...state.historyByAsset,
        [assetId]: sortHistory(history),
      },
    }));
  },

  upsertHistoryEntry: (assetId, entry) => {
    set((state) => {
      const existing = state.historyByAsset[assetId] ?? [];
      const next = sortHistory([
        ...existing.filter((item) => item.id !== entry.id),
        entry,
      ]);
      return {
        historyByAsset: {
          ...state.historyByAsset,
          [assetId]: next,
        },
      };
    });
  },

  setAssignmentsForUser: (userId, assignments) => {
    set((state) => ({
      assignmentsByUser: {
        ...state.assignmentsByUser,
        [userId]: assignments,
      },
    }));
  },

  clear: () => {
    set({
      currentByAsset: {},
      historyByAsset: {},
      assignmentsByUser: {},
    });
  },
}));
