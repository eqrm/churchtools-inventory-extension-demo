import { UndoService, type CompoundActionInput, type UndoHandler, type UndoServiceOptions, type UndoableActionInput } from '../UndoService';
import { getUndoDatabase } from '../db/UndoDatabase';
import type { UndoActionType } from '../../types/undo';
import { backgroundJobService } from '../BackgroundJobService';
import { churchToolsAPIClient } from '../api/ChurchToolsAPIClient';

type HandlerBucket = Partial<Record<UndoActionType, UndoHandler[]>>;

const handlerBuckets: HandlerBucket = {};

async function runHandlers(actionType: UndoActionType, action: Parameters<UndoHandler>[0]): Promise<void> {
  const handlers = handlerBuckets[actionType];
  if (!handlers || handlers.length === 0) {
    throw new Error(`No undo handler registered for action type: ${actionType}`);
  }

  for (const handler of handlers) {
    await handler(action);
  }
}

const aggregatedHandlers: Partial<Record<UndoActionType, UndoHandler>> = {
  create: async (action) => {
    await runHandlers('create', action);
  },
  update: async (action) => {
    await runHandlers('update', action);
  },
  delete: async (action) => {
    await runHandlers('delete', action);
  },
  'status-change': async (action) => {
    await runHandlers('status-change', action);
  },
  compound: async (action) => {
    await runHandlers('compound', action);
  },
};

const serviceOptions: UndoServiceOptions = {
  db: getUndoDatabase(),
  handlers: aggregatedHandlers,
  retentionHours: 24,
  getCurrentActor: async () => {
    const actor = await churchToolsAPIClient.getCurrentUser();
    return { id: actor.id, name: actor.name };
  },
};

const undoService = new UndoService(serviceOptions);

try {
  backgroundJobService.register({
    id: 'undo.cleanup-expired',
    description: 'Remove undo actions older than retention window',
    job: async () => {
      await undoService.cleanupExpired();
    },
  });
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes('already registered')) {
    throw error;
  }
}

export function getUndoService(): UndoService {
  return undoService;
}

export function registerUndoHandler(actionType: UndoActionType, handler: UndoHandler): void {
  const bucket = handlerBuckets[actionType] ?? [];
  handlerBuckets[actionType] = [...bucket, handler];
}

export function unregisterUndoHandler(actionType: UndoActionType): void {
  handlerBuckets[actionType] = [];
}

export async function recordUndoAction(action: UndoableActionInput): Promise<string> {
  return await undoService.recordAction(action);
}

export async function recordCompoundUndoAction(action: CompoundActionInput): Promise<string> {
  return await undoService.recordCompoundAction(action);
}
