import type { ISODate, ISOTimestamp, UUID } from './entities';

export interface MaintenanceCompany {
  id: UUID;
  name: string;
  contactPerson: string;
  address: string;
  serviceLevelAgreement: string;
  hourlyRate?: number;
  contractNotes?: string;
  createdBy: UUID;
  createdByName?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export type MaintenanceTargetType = 'asset' | 'kit' | 'model' | 'tag';

export interface MaintenanceRuleTarget {
  type: MaintenanceTargetType;
  ids: UUID[];
}

export type MaintenanceIntervalType = 'months' | 'uses';

export interface MaintenanceRule {
  id: UUID;
  name: string;
  workType: string;
  isInternal: boolean;
  serviceProviderId?: UUID;
  targets: MaintenanceRuleTarget[];
  intervalType: MaintenanceIntervalType;
  intervalValue: number;
  startDate: ISODate;
  nextDueDate: ISODate;
  leadTimeDays: number;
  createdBy: UUID;
  createdByName?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export type InternalWorkOrderState =
  | 'backlog'
  | 'assigned'
  | 'planned'
  | 'in-progress'
  | 'completed'
  | 'aborted'
  | 'obsolete'
  | 'done';

export type ExternalWorkOrderState =
  | 'backlog'
  | 'offer-requested'
  | 'offer-received'
  | 'planned'
  | 'in-progress'
  | 'completed'
  | 'aborted'
  | 'obsolete'
  | 'done';

export type WorkOrderType = 'internal' | 'external';

export type WorkOrderState = InternalWorkOrderState | ExternalWorkOrderState;

export interface WorkOrderLineItem {
  assetId: UUID;
  completionStatus: 'pending' | 'in-progress' | 'completed';
  completedAt?: ISOTimestamp;
}

export interface WorkOrderOffer {
  companyId: UUID;
  amount: number;
  receivedAt: ISOTimestamp;
  notes?: string;
}

export interface WorkOrderHistoryEntry {
  id: UUID;
  state: WorkOrderState;
  changedAt: ISOTimestamp;
  changedBy: UUID;
  changedByName?: string;
  notes?: string;
}

export interface WorkOrder {
  id: UUID;
  workOrderNumber: string;
  type: WorkOrderType;
  state: WorkOrderState;
  ruleId?: UUID;
  companyId?: UUID;
  assignedTo?: UUID;
  approvalResponsibleId?: UUID;
  leadTimeDays: number;
  scheduledStart?: ISODate;
  scheduledEnd?: ISODate;
  actualStart?: ISODate;
  actualEnd?: ISODate;
  offers?: WorkOrderOffer[];
  lineItems: WorkOrderLineItem[];
  history: WorkOrderHistoryEntry[];
  createdBy: UUID;
  createdByName?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
