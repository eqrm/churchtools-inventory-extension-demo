import { create } from 'zustand';
import type { SettingsVersion } from '../types/settings';

interface SettingsStoreState {
  versions: SettingsVersion[];
  isLoading: boolean;
  isSaving: boolean;
  isImporting: boolean;
  hasLoaded: boolean;
  rollbackVersionId?: string;
  error?: string;
  setVersions: (versions: SettingsVersion[]) => void;
  prependVersion: (version: SettingsVersion) => void;
  setLoading: (value: boolean) => void;
  setSaving: (value: boolean) => void;
  setImporting: (value: boolean) => void;
  setRollbackVersionId: (versionId?: string) => void;
  setError: (message?: string) => void;
  setHasLoaded: (value: boolean) => void;
}

const sortVersions = (versions: SettingsVersion[]): SettingsVersion[] => {
  return [...versions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  versions: [],
  isLoading: false,
  isSaving: false,
  isImporting: false,
  hasLoaded: false,
  rollbackVersionId: undefined,
  error: undefined,
  setVersions: (versions) => set({ versions: sortVersions(versions) }),
  prependVersion: (version) =>
    set((state) => ({
      versions: sortVersions([version, ...state.versions]),
    })),
  setLoading: (value) => set({ isLoading: value }),
  setSaving: (value) => set({ isSaving: value }),
  setImporting: (value) => set({ isImporting: value }),
  setRollbackVersionId: (versionId) => set({ rollbackVersionId: versionId }),
  setError: (message) => set({ error: message }),
  setHasLoaded: (value) => set({ hasLoaded: value }),
}));
