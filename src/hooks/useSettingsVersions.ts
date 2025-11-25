import { useCallback, useEffect } from 'react';
import type { SettingsSnapshot, SettingsVersion } from '../types/settings';
import { useSettingsStore } from '../stores/settingsStore';
import { getSettingsVersionService, getSettingsSnapshot } from '../services/settings';
import { recordUndoAction } from '../services/undo';

const SETTINGS_ENTITY_TYPE = 'settings';
const SETTINGS_ENTITY_ID = 'global-settings';

const normalizeSummary = (summary: string): string => summary.trim().slice(0, 500);

export function useSettingsVersions() {
  const versions = useSettingsStore((state) => state.versions);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const isSaving = useSettingsStore((state) => state.isSaving);
  const isImporting = useSettingsStore((state) => state.isImporting);
  const rollbackVersionId = useSettingsStore((state) => state.rollbackVersionId);
  const error = useSettingsStore((state) => state.error);
  const hasLoaded = useSettingsStore((state) => state.hasLoaded);
  const setVersions = useSettingsStore((state) => state.setVersions);
  const prependVersion = useSettingsStore((state) => state.prependVersion);
  const setLoading = useSettingsStore((state) => state.setLoading);
  const setSaving = useSettingsStore((state) => state.setSaving);
  const setImporting = useSettingsStore((state) => state.setImporting);
  const setRollbackVersionId = useSettingsStore((state) => state.setRollbackVersionId);
  const setError = useSettingsStore((state) => state.setError);
  const setHasLoaded = useSettingsStore((state) => state.setHasLoaded);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const history = await getSettingsVersionService().getVersionHistory();
      setVersions(history);
      setHasLoaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings history';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setError, setHasLoaded, setLoading, setVersions]);

  useEffect(() => {
    if (!hasLoaded) {
      void refresh().catch(() => undefined);
    }
  }, [hasLoaded, refresh]);

  const recordSettingsUndo = useCallback(
    async (beforeSnapshot: SettingsSnapshot, afterSnapshot: SettingsSnapshot, summary: string) => {
      const wrapSnapshot = (value: SettingsSnapshot): Record<string, unknown> => ({ snapshot: value });
      await recordUndoAction({
        entityType: SETTINGS_ENTITY_TYPE,
        entityId: SETTINGS_ENTITY_ID,
        actionType: 'update',
        beforeState: wrapSnapshot(beforeSnapshot),
        afterState: wrapSnapshot(afterSnapshot),
        metadata: { summary },
      });
    },
    [],
  );

  const createVersion = useCallback(
    async (summary: string): Promise<SettingsVersion> => {
      const normalized = normalizeSummary(summary);
      if (!normalized) {
        throw new Error('Change summary is required');
      }

      setSaving(true);
      setError(undefined);
      try {
        const version = await getSettingsVersionService().captureCurrentVersion(normalized);
        prependVersion(version);
        return version;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to create version';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [prependVersion, setError, setSaving],
  );

  const rollbackToVersion = useCallback(
    async (versionId: string): Promise<SettingsVersion> => {
      setRollbackVersionId(versionId);
      setError(undefined);
      try {
        const beforeSnapshot = await getSettingsSnapshot();
        const version = await getSettingsVersionService().rollbackToVersion(versionId);
        await recordSettingsUndo(beforeSnapshot, version.payload, version.changeSummary);
        await refresh();
        return version;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to rollback settings';
        setError(message);
        throw err;
      } finally {
        setRollbackVersionId(undefined);
      }
    },
    [recordSettingsUndo, refresh, setError, setRollbackVersionId],
  );

  const exportSettings = useCallback(async (options?: { scope?: 'full' | 'scanner-only' }): Promise<string> => {
    return await getSettingsVersionService().exportSettings(options);
  }, []);

  const importSettings = useCallback(
    async (jsonData: string, summary?: string): Promise<SettingsVersion> => {
      setImporting(true);
      setError(undefined);
      try {
        const beforeSnapshot = await getSettingsSnapshot();
        const version = await getSettingsVersionService().importSettings(jsonData, normalizeSummary(summary ?? 'Imported settings JSON') || 'Imported settings JSON');
        await recordSettingsUndo(beforeSnapshot, version.payload, version.changeSummary);
        await refresh();
        return version;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to import settings';
        setError(message);
        throw err;
      } finally {
        setImporting(false);
      }
    },
    [recordSettingsUndo, refresh, setError, setImporting],
  );

  return {
    versions,
    isLoading,
    isSaving,
    isImporting,
    rollbackVersionId,
    error,
    refresh,
    createVersion,
    rollbackToVersion,
    exportSettings,
    importSettings,
  } as const;
}
