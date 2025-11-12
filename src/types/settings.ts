import type { ISOTimestamp, UUID } from './entities';

export interface SettingsVersion {
  versionId: UUID;
  changeSummary: string;
  changedBy: UUID;
  changedByName?: string;
  createdAt: ISOTimestamp;
  payload: Record<string, unknown>;
  expiresAt?: ISOTimestamp;
}
