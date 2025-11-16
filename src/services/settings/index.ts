import { SettingsVersionService } from '../SettingsVersionService';
import { getSettingsDatabase } from '../db/SettingsDatabase';
import { churchToolsAPIClient } from '../api/ChurchToolsAPIClient';
import { collectSettingsSnapshot, applySettingsSnapshot, validateSettingsSnapshot } from './settingsSnapshot';
import { registerUndoHandler } from '../undo';
import type { SettingsSnapshot } from '../../types/settings';

let serviceInstance: SettingsVersionService | null = null;
let undoHandlerRegistered = false;

function ensureUndoHandlerRegistered(): void {
  if (undoHandlerRegistered) {
    return;
  }

  registerUndoHandler('update', async (action) => {
    if (action.entityType !== 'settings' || !action.beforeState) {
      return;
    }

    const snapshot = (action.beforeState as { snapshot?: unknown }).snapshot ?? action.beforeState;
    const parsed = validateSettingsSnapshot(snapshot);
    await applySettingsSnapshot(parsed);
  });

  undoHandlerRegistered = true;
}

export function getSettingsVersionService(): SettingsVersionService {
  if (!serviceInstance) {
    serviceInstance = new SettingsVersionService({
      db: getSettingsDatabase(),
      getCurrentActor: async () => {
        const actor = await churchToolsAPIClient.getCurrentUser();
        return { id: actor.id, name: actor.name };
      },
      applySnapshot: async (snapshot: SettingsSnapshot) => {
        await applySettingsSnapshot(snapshot);
      },
      collectSnapshot: async () => await collectSettingsSnapshot(),
      validateSnapshot: (snapshot) => validateSettingsSnapshot(snapshot),
    });

    ensureUndoHandlerRegistered();
  }

  return serviceInstance;
}

export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  return await collectSettingsSnapshot();
}
