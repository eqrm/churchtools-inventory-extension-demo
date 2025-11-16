import type { SettingsSnapshot, SettingsVersion, SettingsVersionOrigin } from '../types/settings';
import { settingsExportSchema } from '../schemas/settings';
import type { SettingsDatabase } from './db/SettingsDatabase';

export interface SettingsVersionServiceOptions {
  db: SettingsDatabase;
  getCurrentActor: () => Promise<{ id: string; name?: string }>;
  applySnapshot: (snapshot: SettingsSnapshot) => Promise<void>;
  collectSnapshot?: () => Promise<SettingsSnapshot>;
  validateSnapshot?: (snapshot: unknown) => SettingsSnapshot;
  retentionDays?: number;
  idFactory?: () => string;
  now?: () => Date;
}

export interface CreateVersionMetadata {
  origin?: SettingsVersionOrigin;
  sourceVersionId?: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_RETENTION_DAYS = 90;
const MAX_SUMMARY_LENGTH = 500;

export class SettingsVersionService {
  private readonly options: SettingsVersionServiceOptions;

  constructor(options: SettingsVersionServiceOptions) {
    this.options = options;
  }

  async createVersion(snapshot: SettingsSnapshot, changeSummary: string, meta: CreateVersionMetadata = {}): Promise<SettingsVersion> {
    const normalizedSummary = this.normalizeSummary(changeSummary);
    if (!normalizedSummary) {
      throw new Error('Change summary is required');
    }

    const actor = await this.options.getCurrentActor();
    const now = this.getNow();
    const versionNumber = await this.getNextVersionNumber();
    const version: SettingsVersion = {
      versionId: this.generateId(),
      versionNumber,
      changeSummary: normalizedSummary,
      changedBy: actor.id,
      changedByName: actor.name,
      createdAt: now.toISOString(),
      expiresAt: this.computeExpiry(now).toISOString(),
      payload: this.validateSnapshot(snapshot),
      origin: meta.origin ?? 'manual',
      sourceVersionId: meta.sourceVersionId,
      metadata: meta.metadata,
    };

    await this.options.db.settingsVersions.put(version);
    return version;
  }

  async captureCurrentVersion(changeSummary: string, meta: CreateVersionMetadata = {}): Promise<SettingsVersion> {
    if (!this.options.collectSnapshot) {
      throw new Error('Settings snapshot collector not configured');
    }
    const snapshot = await this.options.collectSnapshot();
    return await this.createVersion(snapshot, changeSummary, meta);
  }

  async getVersionHistory(): Promise<SettingsVersion[]> {
    const versions = await this.options.db.settingsVersions.toArray();
    return versions.sort((a, b) => {
      const numberDiff = (b.versionNumber ?? 0) - (a.versionNumber ?? 0);
      if (numberDiff !== 0) {
        return numberDiff;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  async rollbackToVersion(versionId: string): Promise<SettingsVersion> {
    const target = await this.options.db.settingsVersions.get(versionId);
    if (!target) {
      throw new Error(`Settings version not found: ${versionId}`);
    }

    await this.options.applySnapshot(target.payload);

    return await this.createVersion(target.payload, `Rolled back to version ${target.versionNumber}`, {
      origin: 'rollback',
      sourceVersionId: target.versionId,
    });
  }

  async exportSettings(): Promise<string> {
    if (!this.options.collectSnapshot) {
      throw new Error('Settings snapshot collector not configured');
    }

    const actor = await this.options.getCurrentActor();
    const snapshot = await this.options.collectSnapshot();
    const payload = settingsExportSchema.parse({
      version: '1.0',
      exportedAt: this.getNow().toISOString(),
      exportedBy: { id: actor.id, name: actor.name },
      settings: this.validateSnapshot(snapshot),
    });

    return JSON.stringify(payload, null, 2);
  }

  async importSettings(jsonData: string, summary = 'Imported settings JSON'): Promise<SettingsVersion> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonData);
    } catch (error) {
      throw new Error(`Invalid JSON payload: ${(error as Error).message}`);
    }

    const envelope = settingsExportSchema.parse(parsed);
    const snapshot = this.validateSnapshot(envelope.settings);

    await this.options.applySnapshot(snapshot);

    return await this.createVersion(snapshot, summary, {
      origin: 'import',
    });
  }

  async cleanupExpiredVersions(): Promise<number> {
    const versions = await this.getVersionHistory();
    if (versions.length <= 1) {
      return 0;
    }

    const nowIso = this.getNow().toISOString();
    const deletions = versions
      .slice(1)
      .filter((version) => {
        const expiresAt = version.expiresAt;
        if (!expiresAt) {
          return false;
        }
        return expiresAt < nowIso;
      })
      .map((version) => version.versionId);

    if (deletions.length === 0) {
      return 0;
    }

    await this.options.db.settingsVersions.bulkDelete(deletions);
    return deletions.length;
  }

  private async getNextVersionNumber(): Promise<number> {
    const versions = await this.options.db.settingsVersions.toArray();
    if (versions.length === 0) {
      return 1;
    }

    return versions.reduce((max, version) => Math.max(max, version.versionNumber ?? 0), 0) + 1;
  }

  private normalizeSummary(summary: string): string {
    return summary.trim().slice(0, MAX_SUMMARY_LENGTH);
  }

  private computeExpiry(now: Date): Date {
    const retentionDays = this.options.retentionDays ?? DEFAULT_RETENTION_DAYS;
    return new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  }

  private validateSnapshot(snapshot: unknown): SettingsSnapshot {
    if (this.options.validateSnapshot) {
      return this.options.validateSnapshot(snapshot);
    }
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Settings snapshot must be an object');
    }
    return snapshot as SettingsSnapshot;
  }

  private getNow(): Date {
    return this.options.now?.() ?? new Date();
  }

  private generateId(): string {
    if (this.options.idFactory) {
      return this.options.idFactory();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
