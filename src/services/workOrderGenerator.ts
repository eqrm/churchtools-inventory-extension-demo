/**
 * Work Order Generator Service
 * 
 * Generates future work orders from maintenance rules up to a configurable horizon.
 * Used for pre-generating scheduled work orders based on recurring maintenance rules.
 */

import type {
  MaintenanceRule,
  WorkOrder,
  WorkOrderType,
  WorkOrderOrderType,
  WorkOrderState,
  WorkOrderLineItem,
} from '../types/maintenance';
import type { ISODate, UUID } from '../types/entities';
import { MAX_WORK_ORDER_HORIZON_MONTHS } from '../constants/maintenance';
import { calculateNextDueDate } from './maintenanceScheduler';

/**
 * Data needed to create a work order (without auto-generated fields)
 */
export interface WorkOrderCreate {
  workOrderNumber?: string;
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
  lineItems: WorkOrderLineItem[];
  createdBy?: UUID;
  createdByName?: string;
}

/**
 * Options for generating future work orders
 */
export interface GenerateFutureWorkOrdersOptions {
  /** Current date for calculation (defaults to now) */
  now?: Date;
  /** Maximum number of work orders to generate (safety limit) */
  maxWorkOrders?: number;
}

/**
 * Generate future work orders from a maintenance rule up to the specified horizon.
 * 
 * This function:
 * 1. Calculates all future due dates based on the rule's interval
 * 2. Filters out dates that already have work orders
 * 3. Returns work order creation data for each remaining date
 * 
 * @param rule The maintenance rule to generate work orders from
 * @param horizonMonths Number of months to look ahead (default: MAX_WORK_ORDER_HORIZON_MONTHS)
 * @param existingWorkOrders Existing work orders to check for duplicates
 * @param options Additional generation options
 * @returns Array of work order creation data
 */
export function generateFutureWorkOrders(
  rule: MaintenanceRule,
  horizonMonths: number = MAX_WORK_ORDER_HORIZON_MONTHS,
  existingWorkOrders: WorkOrder[] = [],
  options: GenerateFutureWorkOrdersOptions = {},
): WorkOrderCreate[] {
  // Uses-based intervals cannot be pre-scheduled
  if (rule.intervalType === 'uses') {
    return [];
  }

  const now = options.now ?? new Date();
  const maxWorkOrders = options.maxWorkOrders ?? 500; // Safety limit
  
  // Calculate end date (horizon)
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + horizonMonths);

  // Get anchor date for first work order
  const anchorDateStr = rule.nextDueDate ?? rule.startDate;
  if (!anchorDateStr) {
    return [];
  }

  const anchorDate = new Date(anchorDateStr);
  if (isNaN(anchorDate.getTime())) {
    return [];
  }

  // Build set of existing scheduled dates for this rule
  const existingDatesForRule = new Set<string>();
  existingWorkOrders
    .filter((wo) => wo.ruleId === rule.id && wo.scheduledStart)
    .forEach((wo) => {
      if (wo.scheduledStart) {
        existingDatesForRule.add(wo.scheduledStart);
      }
    });

  // Generate work orders
  const workOrders: WorkOrderCreate[] = [];
  let currentDate = new Date(anchorDate);
  let iterationCount = 0;
  const maxIterations = 5000; // Safety limit for infinite loop prevention

  while (currentDate <= endDate && workOrders.length < maxWorkOrders && iterationCount < maxIterations) {
    iterationCount++;

    const scheduledStart = toISODate(currentDate);

    // Skip if work order already exists for this date
    if (!existingDatesForRule.has(scheduledStart)) {
      const workOrder = createWorkOrderFromRule(rule, scheduledStart);
      workOrders.push(workOrder);
    }

    // Calculate next due date
    const nextDateStr = calculateNextDueDate(
      rule.intervalType,
      rule.intervalValue,
      currentDate,
    );

    if (!nextDateStr) {
      break;
    }

    const nextDate = new Date(nextDateStr);
    if (isNaN(nextDate.getTime()) || nextDate <= currentDate) {
      break;
    }

    currentDate = nextDate;
  }

  return workOrders;
}

/**
 * Create a work order creation object from a rule and scheduled date
 */
function createWorkOrderFromRule(
  rule: MaintenanceRule,
  scheduledStart: ISODate,
): WorkOrderCreate {
  // Generate line items from rule targets
  const lineItems: WorkOrderLineItem[] = [];
  
  for (const target of rule.targets) {
    if (target.type === 'asset') {
      for (const assetId of target.ids) {
        lineItems.push({
          assetId,
          completionStatus: 'pending',
        });
      }
    }
    // For kit, model, tag targets, the actual asset resolution
    // will happen when the work order is activated
  }

  return {
    type: rule.isInternal ? 'internal' : 'external',
    orderType: 'planned',
    state: 'scheduled',
    ruleId: rule.id,
    companyId: rule.serviceProviderId,
    leadTimeDays: rule.leadTimeDays,
    scheduledStart,
    lineItems,
    createdBy: rule.createdBy,
    createdByName: rule.createdByName,
  };
}

/**
 * Convert a Date to ISO date string (YYYY-MM-DD)
 */
function toISODate(date: Date): ISODate {
  return date.toISOString().split('T')[0] as ISODate;
}
