import type { ISOTimestamp, UUID } from './entities';

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
