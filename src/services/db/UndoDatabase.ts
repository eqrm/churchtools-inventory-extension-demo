import Dexie from 'dexie';
import type { Table } from 'dexie';

import type { UndoAction } from '../../types/undo';

const DATABASE_NAME = 'churchtools-inventory-undo';
const DATABASE_VERSION = 1;

export class UndoDatabase extends Dexie {
  public undoActions!: Table<UndoAction, string>;

  private static instance: UndoDatabase | null = null;

  private constructor() {
    super(DATABASE_NAME);

    this.version(DATABASE_VERSION).stores({
      undoActions: '&actionId, actorId, entityType, entityId, createdAt, expiresAt',
    });
  }

  public static getInstance(): UndoDatabase {
    if (!UndoDatabase.instance) {
      UndoDatabase.instance = new UndoDatabase();
    }

    return UndoDatabase.instance;
  }
}

export const getUndoDatabase = (): UndoDatabase => UndoDatabase.getInstance();
