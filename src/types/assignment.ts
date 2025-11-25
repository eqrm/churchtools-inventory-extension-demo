import type { AssetStatus, ISOTimestamp, UUID } from './entities';

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
  status: AssignmentStatus;
  dueAt?: ISOTimestamp;
  notes?: string;
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

export interface AssignmentRecord extends Assignment {
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface AssignmentCreateInput {
  assetId: UUID;
  target: AssignmentTarget;
  assignedBy: UUID;
  assignedByName?: string;
  assignedAt: ISOTimestamp;
  dueAt?: ISOTimestamp;
  notes?: string;
  status?: AssignmentStatus;
}

export interface AssignmentUpdateInput {
  status?: AssignmentStatus;
  dueAt?: ISOTimestamp | null;
  notes?: string | null;
  checkedInAt?: ISOTimestamp | null;
  checkedInBy?: UUID | null;
  checkedInByName?: string | null;
}

export interface AssignmentUndoMetadata {
  assetId: UUID;
  previousStatus?: AssetStatus;
  previousAssignmentId?: UUID | null;
  target: AssignmentTarget;
}
