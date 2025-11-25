import type { ISOTimestamp, UUID } from './entities';
import type { ScannerModel } from './entities';

export interface SettingsFeatureTogglesSnapshot {
  bookingsEnabled: boolean;
  kitsEnabled: boolean;
  maintenanceEnabled: boolean;
}

export interface SettingsMasterDataSnapshot {
  locations: SettingsMasterDataItem[];
  manufacturers: SettingsMasterDataItem[];
  models: SettingsMasterDataItem[];
  maintenanceCompanies: SettingsMasterDataItem[];
}

export interface SettingsMasterDataItem {
  id: string;
  name: string;
}

export interface SettingsSnapshot {
  schemaVersion: '1.0';
  assetNumberPrefix: string;
  moduleDefaultPrefixId: string | null;
  featureToggles: SettingsFeatureTogglesSnapshot;
  masterData: SettingsMasterDataSnapshot;
  scannerModels: ScannerModel[];
}

export type SettingsVersionOrigin = 'manual' | 'import' | 'rollback';

export interface SettingsVersion {
  versionId: UUID;
  versionNumber: number;
  changeSummary: string;
  changedBy: string;
  changedByName?: string;
  createdAt: ISOTimestamp;
  expiresAt?: ISOTimestamp;
  payload: SettingsSnapshot;
  origin?: SettingsVersionOrigin;
  sourceVersionId?: UUID;
  metadata?: Record<string, unknown>;
}

export interface SettingsExportEnvelope {
  version: string;
  exportedAt: ISOTimestamp;
  exportedBy: {
    id: string;
    name?: string;
  };
  settings: SettingsSnapshot;
}
