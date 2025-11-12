import { create } from 'zustand';
import type { DamageReport } from '../types/damage';

interface DamageStoreState {
  reportsByAsset: Record<string, DamageReport[]>;
  setReports: (assetId: string, reports: DamageReport[]) => void;
  addReport: (assetId: string, report: DamageReport) => void;
  updateReport: (assetId: string, report: DamageReport) => void;
  removeReport: (assetId: string, reportId: string) => void;
  clear: () => void;
}

function sortByReportedAt(records: DamageReport[]): DamageReport[] {
  return [...records].sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
}

export const useDamageStore = create<DamageStoreState>((set) => ({
  reportsByAsset: {},

  setReports: (assetId, reports) => {
    set((state) => ({
      reportsByAsset: {
        ...state.reportsByAsset,
        [assetId]: sortByReportedAt(reports),
      },
    }));
  },

  addReport: (assetId, report) => {
    set((state) => {
      const existing = state.reportsByAsset[assetId] ?? [];
      const next = sortByReportedAt([...existing.filter((item) => item.id !== report.id), report]);
      return {
        reportsByAsset: {
          ...state.reportsByAsset,
          [assetId]: next,
        },
      };
    });
  },

  updateReport: (assetId, report) => {
    set((state) => {
      const existing = state.reportsByAsset[assetId] ?? [];
      const next = sortByReportedAt(
        existing.map((item) => (item.id === report.id ? report : item)),
      );
      return {
        reportsByAsset: {
          ...state.reportsByAsset,
          [assetId]: next,
        },
      };
    });
  },

  removeReport: (assetId, reportId) => {
    set((state) => {
      const existing = state.reportsByAsset[assetId] ?? [];
      const next = existing.filter((item) => item.id !== reportId);
      return {
        reportsByAsset: {
          ...state.reportsByAsset,
          [assetId]: next,
        },
      };
    });
  },

  clear: () => {
    set({ reportsByAsset: {} });
  },
}));
