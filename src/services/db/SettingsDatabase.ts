import Dexie from 'dexie';
import type { Table } from 'dexie';

import type { SettingsVersion } from '../../types/settings';

const DATABASE_NAME = 'churchtools-inventory-settings';
const DATABASE_VERSION = 1;

export class SettingsDatabase extends Dexie {
  public settingsVersions!: Table<SettingsVersion, string>;

  private static instance: SettingsDatabase | null = null;

  private constructor() {
    super(DATABASE_NAME);

    this.version(DATABASE_VERSION).stores({
      settingsVersions: '&versionId, createdAt',
    });
  }

  public static getInstance(): SettingsDatabase {
    if (!SettingsDatabase.instance) {
      SettingsDatabase.instance = new SettingsDatabase();
    }

    return SettingsDatabase.instance;
  }

  public static async resetInstance(): Promise<void> {
    if (SettingsDatabase.instance) {
      await SettingsDatabase.instance.delete();
      SettingsDatabase.instance = null;
    }
  }
}

export const getSettingsDatabase = (): SettingsDatabase => SettingsDatabase.getInstance();

export const resetSettingsDatabase = async (): Promise<void> => {
  await SettingsDatabase.resetInstance();
};
