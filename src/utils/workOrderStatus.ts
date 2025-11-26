/**
 * Work Order Status Utilities
 * 
 * Utilities for determining work order status, distinguishing between
 * scheduled, active, and completed work orders.
 */

import type { WorkOrder, WorkOrderState } from '../types/maintenance';

/**
 * Terminal states - work order is finished (successfully or not)
 */
const TERMINAL_STATES: WorkOrderState[] = ['done', 'completed', 'aborted', 'obsolete'];

/**
 * Active states - work order is in progress or waiting to be worked on
 */
const ACTIVE_STATES: WorkOrderState[] = [
  'backlog',
  'assigned',
  'planned',
  'in-progress',
  'offer-requested',
  'offer-received',
];

/**
 * Check if a work order is in scheduled state (not yet activated)
 */
export function isScheduled(wo: WorkOrder): boolean {
  return wo.state === 'scheduled';
}

/**
 * Check if a work order is active (being worked on, but not scheduled or terminal)
 */
export function isActive(wo: WorkOrder): boolean {
  return ACTIVE_STATES.includes(wo.state);
}

/**
 * Check if a work order is within its lead time window.
 * A work order is within lead time if the current date is >= (scheduledStart - leadTimeDays).
 */
export function isWithinLeadTime(wo: WorkOrder, now: Date = new Date()): boolean {
  if (!wo.scheduledStart) {
    return false;
  }

  const scheduledDate = new Date(wo.scheduledStart);
  if (isNaN(scheduledDate.getTime())) {
    return false;
  }

  // Calculate lead time start date
  const leadTimeStart = new Date(scheduledDate);
  leadTimeStart.setDate(leadTimeStart.getDate() - wo.leadTimeDays);

  return now >= leadTimeStart;
}

/**
 * Check if a work order is overdue (past scheduled end date and still active)
 */
export function isOverdue(wo: WorkOrder, now: Date = new Date()): boolean {
  if (!isActive(wo)) {
    return false;
  }

  if (!wo.scheduledEnd) {
    return false;
  }

  const scheduledEnd = new Date(wo.scheduledEnd);
  if (isNaN(scheduledEnd.getTime())) {
    return false;
  }

  return now > scheduledEnd;
}

/**
 * Work order status categories for display purposes
 */
export type WorkOrderStatusCategory = 
  | 'scheduled' 
  | 'active' 
  | 'overdue' 
  | 'completed' 
  | 'cancelled';

/**
 * Get the status category of a work order for display purposes
 */
export function getWorkOrderStatus(
  wo: WorkOrder,
  now: Date = new Date()
): WorkOrderStatusCategory {
  if (isScheduled(wo)) {
    return 'scheduled';
  }

  if (wo.state === 'done' || wo.state === 'completed') {
    return 'completed';
  }

  if (wo.state === 'aborted' || wo.state === 'obsolete') {
    return 'cancelled';
  }

  if (isOverdue(wo, now)) {
    return 'overdue';
  }

  return 'active';
}

/**
 * Check if a work order is in a terminal state (finished)
 */
export function isTerminal(wo: WorkOrder): boolean {
  return TERMINAL_STATES.includes(wo.state);
}
