import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSettingsVersions } from '../../../src/hooks/useSettingsVersions';
import type { SettingsSnapshot, SettingsVersion } from '../../../src/types/settings';
import { useSettingsStore } from '../../../src/stores/settingsStore';

const hoistedMocks = vi.hoisted(() => {
  const serviceMock = {
    getVersionHistory: vi.fn(),
    captureCurrentVersion: vi.fn(),
    rollbackToVersion: vi.fn(),
    exportSettings: vi.fn(),
    importSettings: vi.fn(),
  };

  return {
    serviceMock,
    getSettingsVersionServiceMock: vi.fn(() => serviceMock),
    getSettingsSnapshotMock: vi.fn(),
    recordUndoActionMock: vi.fn(),
  };
});

const { serviceMock, getSettingsVersionServiceMock, getSettingsSnapshotMock, recordUndoActionMock } = hoistedMocks;

vi.mock('../../../src/services/settings', () => ({
  getSettingsVersionService: hoistedMocks.getSettingsVersionServiceMock,
  getSettingsSnapshot: hoistedMocks.getSettingsSnapshotMock,
}));

vi.mock('../../../src/services/undo', () => ({
  recordUndoAction: hoistedMocks.recordUndoActionMock,
}));

const baseSnapshot: SettingsSnapshot = {
  schemaVersion: '1.0',
  assetNumberPrefix: 'ASSET',
  moduleDefaultPrefixId: null,
  featureToggles: {
    bookingsEnabled: false,
    kitsEnabled: true,
    maintenanceEnabled: false,
  },
  masterData: {
    locations: [],
    manufacturers: [],
    models: [],
    maintenanceCompanies: [],
  },
  scannerModels: [],
};

const createVersion = (overrides: Partial<SettingsVersion> = {}): SettingsVersion => ({
  versionId: overrides.versionId ?? `version-${Math.random().toString(16).slice(2)}`,
  versionNumber: overrides.versionNumber ?? 1,
  changeSummary: overrides.changeSummary ?? 'Initial snapshot',
  changedBy: overrides.changedBy ?? 'user-1',
  changedByName: overrides.changedByName ?? 'Test User',
  createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00.000Z').toISOString(),
  expiresAt: overrides.expiresAt,
  payload: overrides.payload ?? baseSnapshot,
  origin: overrides.origin ?? 'manual',
  sourceVersionId: overrides.sourceVersionId,
  metadata: overrides.metadata,
});

const resetSettingsStore = () => {
  useSettingsStore.setState({
    versions: [],
    isLoading: false,
    isSaving: false,
    isImporting: false,
    hasLoaded: false,
    rollbackVersionId: undefined,
    error: undefined,
  });
};

describe('useSettingsVersions hook', () => {
  beforeEach(() => {
    Object.values(serviceMock).forEach((fn) => fn.mockReset());
    getSettingsVersionServiceMock.mockReturnValue(serviceMock);
    getSettingsSnapshotMock.mockReset();
    recordUndoActionMock.mockReset();
    resetSettingsStore();
  });

  it('loads version history via refresh on mount', async () => {
    const history = [createVersion({ versionId: 'v-1', versionNumber: 2 })];
    serviceMock.getVersionHistory.mockResolvedValueOnce(history);

    const { result } = renderHook(() => useSettingsVersions());

    await waitFor(() => {
      expect(result.current.versions).toHaveLength(1);
    });

    const state = useSettingsStore.getState();
    expect(state.hasLoaded).toBe(true);
    expect(state.versions[0].versionId).toBe('v-1');
    expect(result.current.error).toBeUndefined();
  });

  it('creates a new version and prepends it to state', async () => {
    const newVersion = createVersion({ versionId: 'v-new', versionNumber: 5, changeSummary: 'Trimmed' });
    serviceMock.captureCurrentVersion.mockResolvedValueOnce(newVersion);
    useSettingsStore.setState({ hasLoaded: true });

    const { result } = renderHook(() => useSettingsVersions());

    await act(async () => {
      await result.current.createVersion('  Trimmed  ');
    });

    expect(serviceMock.captureCurrentVersion).toHaveBeenCalledWith('Trimmed');
    expect(useSettingsStore.getState().versions[0].versionId).toBe('v-new');
    expect(result.current.isSaving).toBe(false);
  });

  it('rolls back to a version and records undo history', async () => {
    const beforeSnapshot = { ...baseSnapshot, assetNumberPrefix: 'OLD' };
    const rolledVersion = createVersion({ versionId: 'v-target', payload: { ...baseSnapshot, assetNumberPrefix: 'NEW' } });
    useSettingsStore.setState({ hasLoaded: true });

    getSettingsSnapshotMock.mockResolvedValueOnce(beforeSnapshot);
    serviceMock.rollbackToVersion.mockResolvedValueOnce(rolledVersion);
    serviceMock.getVersionHistory.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSettingsVersions());

    await act(async () => {
      await result.current.rollbackToVersion('v-target');
    });

    expect(serviceMock.rollbackToVersion).toHaveBeenCalledWith('v-target');
    expect(recordUndoActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeState: { snapshot: beforeSnapshot },
        afterState: { snapshot: rolledVersion.payload },
        metadata: expect.objectContaining({ summary: rolledVersion.changeSummary }),
      }),
    );
    expect(useSettingsStore.getState().rollbackVersionId).toBeUndefined();
  });
});
