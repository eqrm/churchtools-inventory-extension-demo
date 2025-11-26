import type { ISODate, ISOTimestamp, UUID } from './entities';

export interface MaintenanceCompany {
  id: UUID;
  name: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
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

/**
 * Interval type for recurring maintenance - days, months, or usage-based.
 */
export type MaintenanceIntervalType = 'days' | 'months' | 'uses';

export type MaintenanceWorkType =
  | 'inspection'
  | 'maintenance'
  | 'planned-repair'
  | 'unplanned-repair'
  | 'improvement'
  | 'custom';

export type MaintenanceRescheduleMode = 'actual-completion' | 'replan-once';

export interface MaintenanceRule {
  id: UUID;
  name: string;
  workType: MaintenanceWorkType;
  workTypeCustomLabel?: string;
  isInternal: boolean;
  serviceProviderId?: UUID;
  targets: MaintenanceRuleTarget[];
  intervalType: MaintenanceIntervalType;
  intervalValue: number;
  startDate: ISODate;
  nextDueDate: ISODate;
  leadTimeDays: number;
  rescheduleMode?: MaintenanceRescheduleMode;
  createdBy: UUID;
  createdByName?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export type InternalWorkOrderState =
  | 'scheduled'
  | 'backlog'
  | 'assigned'
  | 'planned'
  | 'in-progress'
  | 'completed'
  | 'aborted'
  | 'obsolete'
  | 'done';

export type ExternalWorkOrderState =
  | 'scheduled'
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
export type WorkOrderOrderType = 'planned' | 'unplanned' | 'follow-up';

export type WorkOrderState = InternalWorkOrderState | ExternalWorkOrderState;

export interface WorkOrderLineItem {
  assetId: UUID;
  completionStatus: 'pending' | 'in-progress' | 'completed';
  completedAt?: ISOTimestamp;
  scheduledDate?: ISODate; // Per-asset scheduling (T159)
  notes?: string; // Per-asset notes (T159)
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
  orderType: WorkOrderOrderType;
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
