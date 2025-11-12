import { UndoService, type CompoundActionInput, type UndoHandler, type UndoServiceOptions, type UndoableActionInput } from '../UndoService';
import { getUndoDatabase } from '../db/UndoDatabase';
import type { UndoActionType } from '../../types/undo';
import { backgroundJobService } from '../BackgroundJobService';
import { churchToolsAPIClient } from '../api/ChurchToolsAPIClient';

const handlerRegistry: Partial<Record<UndoActionType, UndoHandler>> = {};

const serviceOptions: UndoServiceOptions = {
  db: getUndoDatabase(),
  handlers: handlerRegistry,
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
  handlerRegistry[actionType] = handler;
}

export function unregisterUndoHandler(actionType: UndoActionType): void {
  handlerRegistry[actionType] = undefined;
}

export async function recordUndoAction(action: UndoableActionInput): Promise<string> {
  return await undoService.recordAction(action);
}

export async function recordCompoundUndoAction(action: CompoundActionInput): Promise<string> {
  return await undoService.recordCompoundAction(action);
}
