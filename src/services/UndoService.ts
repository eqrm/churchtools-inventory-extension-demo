import type { UndoDatabase } from './db/UndoDatabase';
import type { UndoAction, UndoActionType } from '../types/undo';

export type UndoHandler = (action: UndoAction) => Promise<void>;

export interface UndoableActionInput {
  entityType: string;
  entityId: string;
  actionType: UndoActionType;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  createdEntityIds?: string[];
}

export interface CompoundActionInput extends UndoableActionInput {
  createdEntityIds: string[];
}

export interface UndoServiceOptions {
  db: UndoDatabase;
  getCurrentActor: () => Promise<{ id: string; name?: string }>;
  handlers?: Partial<Record<UndoActionType, UndoHandler>>;
  idFactory?: () => string;
  now?: () => Date;
  retentionHours?: number;
}

export class UndoService {
  protected readonly options: UndoServiceOptions;

  constructor(options: UndoServiceOptions) {
    this.options = options;
  }

  async recordAction(action: UndoableActionInput): Promise<string> {
    this.assertValidAction(action);

    const actor = await this.options.getCurrentActor();
    const now = this.getNow();
    const actionId = this.generateId();
    const expiresAt = this.computeExpiry(now);

    const undoAction: UndoAction = {
      actionId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: action.entityType,
      entityId: action.entityId,
      actionType: action.actionType,
      beforeState: action.beforeState ?? null,
      afterState: action.afterState ?? null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      undoStatus: 'pending',
      createdEntityIds: action.createdEntityIds?.length ? [...action.createdEntityIds] : undefined,
      metadata: action.metadata,
    };

    await this.options.db.undoActions.put(undoAction);

    return actionId;
  }

  async recordCompoundAction(action: CompoundActionInput): Promise<string> {
    if (!action.createdEntityIds || action.createdEntityIds.length === 0) {
      throw new Error('Compound action requires at least one created entity id');
    }

    return this.recordAction({
      ...action,
      actionType: 'compound',
      createdEntityIds: [...action.createdEntityIds],
    });
  }

  async undoAction(actionId: string): Promise<boolean> {
    const action = await this.options.db.undoActions.get(actionId);
    if (!action) {
      throw new Error(`Undo action not found: ${actionId}`);
    }

    const now = this.getNow();
    if (new Date(action.expiresAt).getTime() < now.getTime()) {
      throw new Error('Undo action has expired');
    }

    if (action.undoStatus === 'reverted') {
      throw new Error('Undo action already applied');
    }

    const actor = await this.options.getCurrentActor();
    if (actor.id !== action.actorId) {
      throw new Error('Cannot undo actions recorded by another user');
    }

    const handler = this.options.handlers?.[action.actionType];
    if (!handler) {
      throw new Error(`No undo handler registered for action type: ${action.actionType}`);
    }

    await handler(action);

    await this.options.db.undoActions.update(actionId, { undoStatus: 'reverted' });

    return true;
  }

  async getUserUndoHistory(limit = 50): Promise<UndoAction[]> {
    const actor = await this.options.getCurrentActor();
    const actions = await this.options.db.undoActions.where('actorId').equals(actor.id).toArray();

    actions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return actions.slice(0, limit);
  }

  async cleanupExpired(): Promise<number> {
    const nowIso = this.getNow().toISOString();
    const expired = await this.options.db.undoActions.where('expiresAt').below(nowIso).toArray();

    if (expired.length === 0) {
      return 0;
    }

    await this.options.db.undoActions.bulkDelete(expired.map((action) => action.actionId));
    return expired.length;
  }

  private assertValidAction(action: UndoableActionInput): void {
    if (!action.entityId) {
      throw new Error('Undo action requires entityId');
    }

    if (!action.entityType) {
      throw new Error('Undo action requires entityType');
    }

    if (!action.actionType) {
      throw new Error('Undo action requires actionType');
    }
  }

  private getNow(): Date {
    return this.options.now?.() ?? new Date();
  }

  private computeExpiry(createdAt: Date): Date {
    const hours = this.options.retentionHours ?? 24;
    return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
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
