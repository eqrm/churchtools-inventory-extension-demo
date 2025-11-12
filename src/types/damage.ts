import type { AssetStatus, ISOTimestamp, UUID } from './entities';

export type DamageStatus = 'broken' | 'repaired';

export interface DamageReportPhoto {
  id: UUID;
  base64Data: string;
  mimeType: string;
  createdAt: ISOTimestamp;
}

export interface DamageReport {
  id: UUID;
  assetId: UUID;
  description: string;
  status: DamageStatus;
  photos: DamageReportPhoto[];
  reportedBy: UUID;
  reportedByName?: string;
  reportedAt: ISOTimestamp;
  repairedBy?: UUID;
  repairedByName?: string;
  repairedAt?: ISOTimestamp;
  repairNotes?: string;
}

export interface DamageReportRecord {
  id: UUID;
  assetId: UUID;
  description: string;
  photoHandles: string[];
  status: DamageStatus;
  reportedBy: UUID;
  reportedByName?: string;
  reportedAt: ISOTimestamp;
  repairedBy?: UUID;
  repairedByName?: string;
  repairedAt?: ISOTimestamp;
  repairNotes?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface DamageReportCreateInput {
  description: string;
  photoHandles: string[];
  reportedBy: UUID;
  reportedByName?: string;
  reportedAt: ISOTimestamp;
  status?: DamageStatus;
}

export interface DamageRepairInput {
  repairNotes: string;
  repairedBy: UUID;
  repairedByName?: string;
  repairedAt: ISOTimestamp;
}

export interface DamageUndoContext {
  assetId: UUID;
  assetStatus?: AssetStatus;
  photoHandles?: string[];
}
