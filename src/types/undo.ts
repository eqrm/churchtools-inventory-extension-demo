import type { ISOTimestamp, UUID } from './entities';

export type UndoActionType = 'create' | 'update' | 'delete' | 'status-change' | 'compound';

export type UndoActionStatus = 'pending' | 'reverted';

export interface UndoAction {
  actionId: UUID;
  actorId: UUID;
  actorName?: string;
  entityType: string;
  entityId: UUID;
  actionType: UndoActionType;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  createdAt: ISOTimestamp;
  expiresAt: ISOTimestamp;
  undoStatus: UndoActionStatus;
  createdEntityIds?: UUID[];
  metadata?: Record<string, unknown>;
}

export interface UndoHistoryFilter {
  actorId: UUID;
  limit?: number;
}
