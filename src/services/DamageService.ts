import { PhotoStorageService } from './PhotoStorageService';
import type { DamageReport, DamageReportPhoto, DamageReportRecord } from '../types/damage';
import type { IStorageProvider } from '../types/storage';
import type { Asset, AssetStatus } from '../types/entities';
import { recordUndoAction, registerUndoHandler } from './undo';
import type { UndoAction } from '../types/undo';

export interface CreateDamageReportDTO {
  description: string;
  photos?: Array<File | string>;
}

export interface RepairDamageReportDTO {
  repairNotes: string;
  repairedAt?: string;
}

export interface DamageServiceOptions {
  storageProvider: IStorageProvider;
  photoStorage?: PhotoStorageService;
  now?: () => Date;
}

interface DamageUndoBeforeState {
  damageReport?: DamageReportRecord;
  assetStatus?: AssetStatus;
}

interface DamageUndoMetadata {
  assetId: string;
  assetStatus?: AssetStatus;
  photoHandles?: string[];
}

export class DamageService {
  private static instance: DamageService | null = null;

  private static undoHandlersRegistered = false;

  private readonly storageProvider: IStorageProvider;

  private readonly photoStorage: PhotoStorageService;

  private readonly now: () => Date;

  constructor(options: DamageServiceOptions) {
    this.storageProvider = options.storageProvider;
    this.photoStorage = options.photoStorage ?? new PhotoStorageService();
    this.now = options.now ?? (() => new Date());

    DamageService.instance = this;

    if (!DamageService.undoHandlersRegistered) {
      this.registerUndoHandlers();
      DamageService.undoHandlersRegistered = true;
    }
  }

  async createDamageReport(assetId: string, input: CreateDamageReportDTO): Promise<DamageReport> {
    if (!input.description || input.description.trim().length < 10) {
      throw new Error('Damage description must be at least 10 characters.');
    }

    const asset = await this.storageProvider.getAsset(assetId);
    if (!asset) {
      throw new Error('Asset not found.');
    }

    const photos = await this.normalizePhotos(input.photos ?? []);
    const photoHandles = photos.length > 0 ? await this.photoStorage.storePhotos(photos) : [];
    const currentUser = await this.storageProvider.getCurrentUser();
    const timestamp = this.now().toISOString();

    const record = await this.storageProvider.createDamageReport(assetId, {
      description: input.description.trim(),
      photoHandles,
      reportedBy: currentUser.id,
      reportedByName: currentUser.name,
      reportedAt: timestamp,
      status: 'broken',
    });

    const previousStatus = asset.status;
    if (previousStatus !== 'broken') {
      await this.storageProvider.updateAsset(assetId, { status: 'broken' });
    }

    await recordUndoAction({
      entityType: 'damage-report',
      entityId: record.id,
      actionType: 'create',
      beforeState: {
        assetStatus: previousStatus,
      },
      afterState: {
        damageReport: record,
      },
      metadata: {
        assetId,
        assetStatus: previousStatus,
        photoHandles,
      } satisfies DamageUndoMetadata,
    });

    return await this.toDamageReport(record);
  }

  async markAsRepaired(reportId: string, input: RepairDamageReportDTO): Promise<DamageReport> {
    if (!input.repairNotes || input.repairNotes.trim().length === 0) {
      throw new Error('Repair notes are required to mark as repaired.');
    }

    const existing = await this.storageProvider.getDamageReport(reportId);
    if (!existing) {
      throw new Error('Damage report not found.');
    }

    const asset = await this.storageProvider.getAsset(existing.assetId);
    const previousStatus = asset?.status;

    const currentUser = await this.storageProvider.getCurrentUser();
    const repairedAt = input.repairedAt ?? this.now().toISOString();

    const updatedRecord = await this.storageProvider.markDamageReportAsRepaired(reportId, {
      repairNotes: input.repairNotes.trim(),
      repairedBy: currentUser.id,
      repairedByName: currentUser.name,
      repairedAt,
    });

    await this.storageProvider.updateAsset(existing.assetId, { status: 'available' });

    await recordUndoAction({
      entityType: 'damage-report',
      entityId: reportId,
      actionType: 'update',
      beforeState: {
        damageReport: existing,
        assetStatus: previousStatus,
      } satisfies DamageUndoBeforeState,
      afterState: {
        damageReport: updatedRecord,
        assetStatus: 'available',
      },
    });

    return await this.toDamageReport(updatedRecord);
  }

  async getRepairHistory(assetId: string): Promise<DamageReport[]> {
    const records = await this.storageProvider.getDamageReports(assetId);
    const reports = await Promise.all(records.map(async (record) => await this.toDamageReport(record)));
    return reports;
  }

  async getBrokenAssets(): Promise<Asset[]> {
    return await this.storageProvider.getAssets({ status: 'broken' });
  }

  private static requireInstance(): DamageService {
    if (!DamageService.instance) {
      throw new Error('DamageService has not been initialized.');
    }
    return DamageService.instance;
  }

  private registerUndoHandlers(): void {
    registerUndoHandler('create', async (action: UndoAction) => {
      if (action.entityType !== 'damage-report') {
        return;
      }

      const service = DamageService.requireInstance();
      const metadata = (action.metadata as DamageUndoMetadata | undefined) ?? undefined;
      const assetId = metadata?.assetId ?? (action.afterState as { damageReport?: DamageReportRecord })?.damageReport?.assetId;
      const photoHandles = metadata?.photoHandles ?? [];

      await service.storageProvider.deleteDamageReport(action.entityId);

      if (photoHandles.length > 0) {
        await service.photoStorage.deletePhotos(photoHandles);
      }

      const previousStatus = metadata?.assetStatus ?? (action.beforeState as DamageUndoBeforeState | null)?.assetStatus;
      if (assetId && previousStatus) {
        await service.storageProvider.updateAsset(assetId, { status: previousStatus });
      }
    });

    registerUndoHandler('update', async (action: UndoAction) => {
      if (action.entityType !== 'damage-report') {
        return;
      }

      const service = DamageService.requireInstance();
      const before = (action.beforeState as DamageUndoBeforeState | null) ?? null;
      const beforeReport = before?.damageReport;

      if (!beforeReport) {
        throw new Error('Cannot undo damage report update without previous state.');
      }

      await service.storageProvider.updateDamageReport(beforeReport.id, {
        status: beforeReport.status,
        repairNotes: beforeReport.repairNotes ?? undefined,
        repairedBy: beforeReport.repairedBy ?? undefined,
        repairedByName: beforeReport.repairedByName ?? undefined,
        repairedAt: beforeReport.repairedAt ?? undefined,
        updatedAt: beforeReport.updatedAt,
      });

      if (before?.assetStatus) {
        await service.storageProvider.updateAsset(beforeReport.assetId, { status: before.assetStatus });
      }
    });
  }

  private async toDamageReport(record: DamageReportRecord): Promise<DamageReport> {
    const photos = await Promise.all(
      record.photoHandles.map(async (handle, index) => await this.createPhoto(handle, record, index)),
    );

    const reportedByName = await this.resolvePersonName(record.reportedBy, record.reportedByName);
    const repairedByName = record.repairedBy
      ? await this.resolvePersonName(record.repairedBy, record.repairedByName)
      : undefined;

    return {
      id: record.id,
      assetId: record.assetId,
      description: record.description,
      status: record.status,
      photos,
      reportedBy: record.reportedBy,
      reportedByName,
      reportedAt: record.reportedAt,
      repairedBy: record.repairedBy,
      repairedByName,
      repairedAt: record.repairedAt,
      repairNotes: record.repairNotes ?? undefined,
    };
  }

  private async createPhoto(handle: string, record: DamageReportRecord, index: number): Promise<DamageReportPhoto> {
    const dataUrl = await this.photoStorage.retrievePhoto(handle);
    const mimeType = this.extractMimeType(dataUrl) ?? 'image/jpeg';
    return {
      id: `${record.id}-photo-${index + 1}`,
      base64Data: dataUrl,
      mimeType,
      createdAt: record.reportedAt,
    };
  }

  private extractMimeType(dataUrl: string): string | undefined {
    const match = /^data:([^;]+);/u.exec(dataUrl);
    return match?.[1];
  }

  private async resolvePersonName(personId: string, cached?: string): Promise<string | undefined> {
    if (cached) {
      return cached;
    }

    try {
      const person = await this.storageProvider.getPersonInfo(personId);
      return person.name;
    } catch (error) {
      console.warn('[DamageService] Failed to resolve person name', error);
      return cached;
    }
  }

  private async normalizePhotos(inputs: Array<File | string>): Promise<File[]> {
    if (inputs.length === 0) {
      return [];
    }

    return await Promise.all(
      inputs.map(async (input, index) => {
        if (input instanceof File) {
          return input;
        }
        return await this.dataUrlToFile(input, index);
      }),
    );
  }

  private async dataUrlToFile(dataUrl: string, index: number): Promise<File> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';
    const extension = this.detectExtension(mimeType);
    return new File([blob], `damage-photo-${index + 1}.${extension}`, { type: mimeType });
  }

  private detectExtension(mimeType: string): string {
    const [, subtype] = mimeType.split('/');
    if (!subtype) {
      return 'jpg';
    }
    if (subtype === 'jpeg') {
      return 'jpg';
    }
    return subtype;
  }
}
