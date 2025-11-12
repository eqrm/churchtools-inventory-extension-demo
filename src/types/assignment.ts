import type { ISOTimestamp, UUID } from './entities';

export type AssignmentTargetType = 'person' | 'group';

export interface AssignmentTarget {
  type: AssignmentTargetType;
  id: UUID;
  name: string;
}

export type AssignmentStatus = 'active' | 'returned';

export interface AssignmentHistoryEntry {
  id: UUID;
  assetId: UUID;
  target: AssignmentTarget;
  assignedBy: UUID;
  assignedByName?: string;
  assignedAt: ISOTimestamp;
  checkedInAt?: ISOTimestamp;
  checkedInBy?: UUID;
  checkedInByName?: string;
}

export interface Assignment {
  id: UUID;
  assetId: UUID;
  target: AssignmentTarget;
  status: AssignmentStatus;
  assignedBy: UUID;
  assignedByName?: string;
  assignedAt: ISOTimestamp;
  dueAt?: ISOTimestamp;
  checkedInAt?: ISOTimestamp;
  checkedInBy?: UUID;
  checkedInByName?: string;
  notes?: string;
}
