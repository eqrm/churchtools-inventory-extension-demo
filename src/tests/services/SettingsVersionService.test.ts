import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsVersionService } from '../../services/SettingsVersionService';
import { getSettingsDatabase, resetSettingsDatabase } from '../../services/db/SettingsDatabase';
import type { SettingsSnapshot } from '../../types/settings';

const BASE_DATE = new Date('2025-01-01T00:00:00.000Z');

const DEFAULT_SNAPSHOT: SettingsSnapshot = {
  schemaVersion: '1.0',
  assetNumberPrefix: 'ASSET',
  moduleDefaultPrefixId: null,
  featureToggles: {
    bookingsEnabled: false,
    kitsEnabled: false,
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

function createSnapshot(overrides: Partial<SettingsSnapshot> = {}): SettingsSnapshot {
  return {
    schemaVersion: '1.0',
    assetNumberPrefix: overrides.assetNumberPrefix ?? DEFAULT_SNAPSHOT.assetNumberPrefix,
    moduleDefaultPrefixId: overrides.moduleDefaultPrefixId ?? DEFAULT_SNAPSHOT.moduleDefaultPrefixId,
    featureToggles: {
      ...DEFAULT_SNAPSHOT.featureToggles,
      ...overrides.featureToggles,
    },
    masterData: {
      locations: overrides.masterData?.locations ?? [...DEFAULT_SNAPSHOT.masterData.locations],
      manufacturers: overrides.masterData?.manufacturers ?? [...DEFAULT_SNAPSHOT.masterData.manufacturers],
      models: overrides.masterData?.models ?? [...DEFAULT_SNAPSHOT.masterData.models],
      maintenanceCompanies:
        overrides.masterData?.maintenanceCompanies ?? [...DEFAULT_SNAPSHOT.masterData.maintenanceCompanies],
    },
    scannerModels: overrides.scannerModels ?? [...DEFAULT_SNAPSHOT.scannerModels],
  };
}

function createService(overrides: Partial<ConstructorParameters<typeof SettingsVersionService>[0]> = {}) {
  const db = getSettingsDatabase();
  const currentTime = BASE_DATE.getTime();

  return new SettingsVersionService({
    db,
    getCurrentActor: async () => ({ id: 'user-1', name: 'Test User' }),
    applySnapshot: async () => {},
    collectSnapshot: async () => createSnapshot(),
    now: () => new Date(currentTime),
    retentionDays: 1,
    ...overrides,
  });
}

describe('SettingsVersionService (T178-T187)', () => {
  beforeEach(async () => {
    await resetSettingsDatabase();
  });

  it('creates versions with incrementing numbers and metadata (T178)', async () => {
    const service = createService();
    const first = await service.createVersion(createSnapshot(), 'Initial import');
    const second = await service.createVersion(
      createSnapshot({ masterData: { ...DEFAULT_SNAPSHOT.masterData, locations: [{ id: 'loc-1', name: 'Main Hall' }] } }),
      'Added prefix',
    );

    expect(first.versionNumber).toBe(1);
    expect(second.versionNumber).toBe(2);
    expect(second.origin).toBe('manual');

    const history = await service.getVersionHistory();
    expect(history).toHaveLength(2);
    expect(history[0].versionId).toBe(second.versionId);
  });

  it('captures current settings when collector is configured (T178)', async () => {
    const collector = vi.fn(async () => createSnapshot({ assetNumberPrefix: 'SCAN' }));
    const service = createService({ collectSnapshot: collector });

    const version = await service.captureCurrentVersion('Snapshot');

    expect(collector).toHaveBeenCalledTimes(1);
    expect(version.payload.assetNumberPrefix).toBe('SCAN');
  });

  it('rolls back to a prior version and records a follow-up entry (T181, T186)', async () => {
    const applied: SettingsSnapshot[] = [];
    const service = createService({
      applySnapshot: async (snapshot) => {
        applied.push(snapshot);
      },
    });

    const original = await service.createVersion(
      createSnapshot({ assetNumberPrefix: 'AAA' }),
      'Original',
    );
    await service.createVersion(createSnapshot({ assetNumberPrefix: 'BBB' }), 'Second');

    const rollback = await service.rollbackToVersion(original.versionId);

    expect(applied).toHaveLength(1);
    expect(applied[0].assetNumberPrefix).toBe('AAA');
    expect(rollback.origin).toBe('rollback');
    expect(rollback.sourceVersionId).toBe(original.versionId);
    expect(rollback.versionNumber).toBe(3);
  });

  it('exports current settings as formatted JSON (T182)', async () => {
    const service = createService({
      collectSnapshot: async () =>
        createSnapshot({
          featureToggles: { bookingsEnabled: true, kitsEnabled: false, maintenanceEnabled: true },
        }),
    });

    const json = await service.exportSettings();
    const parsed = JSON.parse(json) as { version: string; settings: SettingsSnapshot };

    expect(parsed.version).toBe('1.0');
    expect(parsed.settings.featureToggles.bookingsEnabled).toBe(true);
  });

  it('imports settings from JSON and applies snapshot (T183-T185)', async () => {
    const applySnapshot = vi.fn(async (_snapshot: SettingsSnapshot) => {});
    const service = createService({ applySnapshot });

    const payload = JSON.stringify({
      version: '1.0',
      exportedAt: BASE_DATE.toISOString(),
      exportedBy: { id: 'user-1', name: 'Test User' },
      settings: createSnapshot({
        masterData: {
          ...DEFAULT_SNAPSHOT.masterData,
          locations: [{ id: 'loc-1', name: 'Auditorium' }],
        },
      }),
    });

    const version = await service.importSettings(payload, 'Imported backup');

    expect(applySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ masterData: expect.objectContaining({ locations: [{ id: 'loc-1', name: 'Auditorium' }] }) }),
    );
    expect(version.origin).toBe('import');
  });

  it('rejects invalid JSON payloads during import (T185)', async () => {
    const service = createService();
    await expect(service.importSettings('not-json')).rejects.toThrow(/Invalid JSON payload/);
  });

  it('cleans up expired versions but preserves the most recent entry (T187)', async () => {
    const service = createService();
    const first = await service.createVersion(createSnapshot({ assetNumberPrefix: 'AAA' }), 'First');
    const second = await service.createVersion(createSnapshot({ assetNumberPrefix: 'BBB' }), 'Second');

    const db = getSettingsDatabase();
    await db.settingsVersions.update(first.versionId, { expiresAt: '2024-01-01T00:00:00.000Z' });
    await db.settingsVersions.update(second.versionId, { expiresAt: '2026-01-01T00:00:00.000Z' });

    const deleted = await service.cleanupExpiredVersions();
    expect(deleted).toBe(1);

    const remaining = await service.getVersionHistory();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].versionId).toBe(second.versionId);
  });
});
