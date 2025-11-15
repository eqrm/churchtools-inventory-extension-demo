import type { Asset, AssetStatus } from '../types/entities';
import type {
  Assignment,
  AssignmentHistoryEntry,
  AssignmentRecord,
  AssignmentTarget,
  AssignmentUndoMetadata,
} from '../types/assignment';
import type { IStorageProvider } from '../types/storage';
import { recordUndoAction, registerUndoHandler } from './undo';

export interface AssignAssetOptions {
  target: AssignmentTarget;
  assignedAt?: string;
  dueAt?: string;
  notes?: string;
}

export interface AssignmentServiceOptions {
  storageProvider: IStorageProvider;
  now?: () => Date;
}

interface AssignmentUndoBeforeState {
  assignment?: AssignmentRecord;
  assetStatus?: AssetStatus;
}

export class AssignmentService {
  private static instance: AssignmentService | null = null;
  private static undoHandlersRegistered = false;

  private readonly storageProvider: IStorageProvider;
  private readonly now: () => Date;

  constructor(options: AssignmentServiceOptions) {
    this.storageProvider = options.storageProvider;
    this.now = options.now ?? (() => new Date());

    AssignmentService.instance = this;

    if (!AssignmentService.undoHandlersRegistered) {
      this.registerUndoHandlers();
      AssignmentService.undoHandlersRegistered = true;
    }
  }

  async assignAsset(assetId: string, input: AssignAssetOptions): Promise<Assignment> {
    const asset = await this.storageProvider.getAsset(assetId);
    if (!asset) {
      throw new Error('Asset not found.');
    }

    const existingAssignments = await this.storageProvider.getAssignments(assetId);
    const activeAssignment = existingAssignments.find((record) => record.status === 'active');
    if (activeAssignment) {
      throw new Error('Asset is already assigned. Check in the current assignment first.');
    }

    const actor = await this.storageProvider.getCurrentUser();
    const assignedAt = input.assignedAt ?? this.now().toISOString();

    const record = await this.storageProvider.createAssignment(assetId, {
      assetId,
      target: input.target,
      assignedBy: actor.id,
      assignedByName: actor.name,
      assignedAt,
      dueAt: input.dueAt,
      notes: input.notes,
      status: 'active',
    });

    await this.storageProvider.updateAsset(assetId, {
      status: 'in-use',
      currentAssignmentId: record.id,
      inUseBy: this.createInUseBy(record),
    });

    await recordUndoAction({
      entityType: 'assignment',
      entityId: record.id,
      actionType: 'create',
      beforeState: {
        assetStatus: asset.status,
      },
      afterState: {
        assignment: record,
        assetStatus: 'in-use',
      },
      metadata: {
        assetId,
        previousStatus: asset.status,
        previousAssignmentId: asset.currentAssignmentId ?? null,
        target: record.target,
      } satisfies AssignmentUndoMetadata,
    });

    return this.toAssignment(record);
  }

  async checkInAsset(assignmentId: string): Promise<Assignment> {
    const record = await this.storageProvider.getAssignment(assignmentId);
    if (!record) {
      throw new Error('Assignment not found.');
    }
    if (record.status === 'returned') {
      throw new Error('Assignment already checked in.');
    }

    const asset = await this.storageProvider.getAsset(record.assetId);
    if (!asset) {
      throw new Error('Asset not found.');
    }

    const actor = await this.storageProvider.getCurrentUser();
    const timestamp = this.now().toISOString();

    const updatedRecord = await this.storageProvider.updateAssignment(assignmentId, {
      status: 'returned',
      checkedInAt: timestamp,
      checkedInBy: actor.id,
      checkedInByName: actor.name,
    });

    await this.storageProvider.updateAsset(record.assetId, {
      status: 'available',
      currentAssignmentId: undefined,
      inUseBy: undefined,
    });

    await recordUndoAction({
      entityType: 'assignment',
      entityId: assignmentId,
      actionType: 'update',
      beforeState: {
        assignment: record,
        assetStatus: asset.status,
      },
      afterState: {
        assignment: updatedRecord,
        assetStatus: 'available',
      },
      metadata: {
        assetId: record.assetId,
        target: record.target,
      } satisfies AssignmentUndoMetadata,
    });

    return this.toAssignment(updatedRecord);
  }

  async getAssignmentHistory(assetId: string): Promise<AssignmentHistoryEntry[]> {
    const records = await this.storageProvider.getAssignments(assetId);
    return records.map((record) => this.toHistoryEntry(record));
  }

  async getCurrentAssignment(assetId: string): Promise<Assignment | null> {
    const records = await this.storageProvider.getAssignments(assetId);
    const active = records.find((record) => record.status === 'active');
    return active ? this.toAssignment(active) : null;
  }

  async getUserAssignments(userId: string): Promise<Asset[]> {
    const records = await this.storageProvider.getAssignmentsForTarget(userId, 'person');
    const assetIds = Array.from(new Set(records.map((record) => record.assetId)));

    const assets = await Promise.all(
      assetIds.map(async (id) => await this.storageProvider.getAsset(id)),
    );

    return assets.filter((asset): asset is Asset => Boolean(asset));
  }

  private registerUndoHandlers(): void {
    registerUndoHandler('create', async (action) => {
      if (action.entityType !== 'assignment') {
        return;
      }

      const service = AssignmentService.requireInstance();
      const afterState = (action.afterState as { assignment?: AssignmentRecord }) ?? {};
      const assignment = afterState.assignment;
      if (!assignment) {
        throw new Error('Cannot undo assignment creation without assignment state.');
      }

      const metadata = (action.metadata as AssignmentUndoMetadata | undefined) ?? undefined;
      const assetId = metadata?.assetId ?? assignment.assetId;
      await service.storageProvider.deleteAssignment(assignment.id);

      await service.storageProvider.updateAsset(assetId, {
        status: metadata?.previousStatus ?? 'available',
        currentAssignmentId: metadata?.previousAssignmentId ?? undefined,
        inUseBy: undefined,
      });
    });

    registerUndoHandler('update', async (action) => {
      if (action.entityType !== 'assignment') {
        return;
      }

      const service = AssignmentService.requireInstance();
      const before = (action.beforeState as AssignmentUndoBeforeState | null) ?? null;
      const beforeAssignment = before?.assignment;
      if (!beforeAssignment) {
        throw new Error('Cannot undo assignment update without previous state.');
      }

      await service.storageProvider.updateAssignment(beforeAssignment.id, {
        status: beforeAssignment.status,
        checkedInAt: beforeAssignment.checkedInAt ?? null,
        checkedInBy: beforeAssignment.checkedInBy ?? null,
        checkedInByName: beforeAssignment.checkedInByName ?? null,
        dueAt: beforeAssignment.dueAt ?? null,
        notes: beforeAssignment.notes ?? null,
      });

      await service.storageProvider.updateAsset(beforeAssignment.assetId, {
        status: before?.assetStatus ?? 'in-use',
        currentAssignmentId: beforeAssignment.status === 'active' ? beforeAssignment.id : undefined,
        inUseBy: beforeAssignment.status === 'active' ? service.createInUseBy(beforeAssignment) : undefined,
      });
    });
  }

  private static requireInstance(): AssignmentService {
    if (!AssignmentService.instance) {
      throw new Error('AssignmentService has not been initialized.');
    }
    return AssignmentService.instance;
  }

  private toAssignment(record: AssignmentRecord): Assignment {
    return {
      id: record.id,
      assetId: record.assetId,
      target: record.target,
      status: record.status,
      assignedBy: record.assignedBy,
      assignedByName: record.assignedByName,
      assignedAt: record.assignedAt,
      dueAt: record.dueAt,
      checkedInAt: record.checkedInAt,
      checkedInBy: record.checkedInBy ?? undefined,
      checkedInByName: record.checkedInByName ?? undefined,
      notes: record.notes ?? undefined,
    };
  }

  private toHistoryEntry(record: AssignmentRecord): AssignmentHistoryEntry {
    return {
      id: record.id,
      assetId: record.assetId,
      target: record.target,
      assignedBy: record.assignedBy,
      assignedByName: record.assignedByName,
      assignedAt: record.assignedAt,
      status: record.status,
      dueAt: record.dueAt,
      notes: record.notes ?? undefined,
      checkedInAt: record.checkedInAt ?? undefined,
      checkedInBy: record.checkedInBy ?? undefined,
      checkedInByName: record.checkedInByName ?? undefined,
    };
  }

  private createInUseBy(record: AssignmentRecord): Asset['inUseBy'] | undefined {
    if (record.target.type !== 'person') {
      return undefined;
    }

    return {
      personId: record.target.id,
      personName: record.target.name,
      since: record.assignedAt,
    };
  }
}
