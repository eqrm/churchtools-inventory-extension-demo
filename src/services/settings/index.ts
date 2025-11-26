import { collectSettingsSnapshot } from './settingsSnapshot';
import type { SettingsSnapshot } from '../../types/settings';

export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  return await collectSettingsSnapshot();
}
