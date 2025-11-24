import type { MaintenanceRule, MaintenanceRescheduleMode, WorkOrder } from '../types/maintenance';
import type { ISODate } from '../types/entities';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const FINAL_STATES: Array<WorkOrder['state']> = ['done', 'aborted', 'obsolete'];

export interface RuleCompletionUpdate {
  nextDueDate: ISODate;
  updatedStartDate?: ISODate;
  nextRescheduleMode?: MaintenanceRescheduleMode;
}

export interface RulePreviewOptions {
  occurrences?: number;
  startDateOverride?: Date;
  now?: Date;
}

export interface RulePreviewItem {
  dueDate: ISODate;
  leadTimeStart: ISODate;
  isPast: boolean;
}

export function calculateNextDueDate(
  intervalType: MaintenanceRule['intervalType'],
  intervalValue: number,
  anchor: Date,
): ISODate | null {
  if (intervalType !== 'months') {
    return null;
  }

  const dueDate = new Date(anchor);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  dueDate.setMonth(dueDate.getMonth() + intervalValue);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  return toISODate(dueDate);
}

export function shouldCreateWorkOrder(
  rule: MaintenanceRule,
  workOrders: WorkOrder[],
  today: Date,
): boolean {
  const dueIso = rule.nextDueDate ?? rule.startDate;
  if (!dueIso) {
    return false;
  }

  const dueDate = new Date(dueIso);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const ruleOrders = workOrders.filter((wo) => wo.ruleId === rule.id);
  const hasOpenOrder = ruleOrders.some((wo) => !FINAL_STATES.includes(wo.state));
  if (hasOpenOrder) {
    return false;
  }

  const scheduledDate = addDays(dueDate, -rule.leadTimeDays);
  return today >= scheduledDate;
}

export function computeScheduleAfterCompletion(
  rule: MaintenanceRule,
  completionIso: string,
): RuleCompletionUpdate | null {
  const completionDate = new Date(completionIso);
  if (Number.isNaN(completionDate.getTime())) {
    return null;
  }

  const baseNextDue = calculateNextDueDate(rule.intervalType, rule.intervalValue, completionDate);
  if (!baseNextDue) {
    return null;
  }

  let nextDueDate = baseNextDue;
  let updatedStartDate: ISODate | undefined;
  let nextRescheduleMode: MaintenanceRescheduleMode | undefined;

  if (getRescheduleMode(rule) === 'replan-once') {
    const scheduledDue = parseIsoDate(rule.nextDueDate) ?? parseIsoDate(rule.startDate);
    const startDate = parseIsoDate(rule.startDate);
    if (scheduledDue && startDate) {
      const deltaDays = Math.round(
        (completionDate.getTime() - scheduledDue.getTime()) / DAY_IN_MS,
      );
      if (deltaDays !== 0) {
        nextDueDate = toISODate(addDays(new Date(baseNextDue), deltaDays));
        updatedStartDate = toISODate(addDays(startDate, deltaDays));
      }
    }
    nextRescheduleMode = 'actual-completion';
  }

  const didChange =
    nextDueDate !== rule.nextDueDate ||
    updatedStartDate !== undefined ||
    nextRescheduleMode !== undefined;

  if (!didChange) {
    return null;
  }

  return {
    nextDueDate,
    updatedStartDate,
    nextRescheduleMode,
  };
}

export function previewRuleSchedule(
  rule: MaintenanceRule,
  options: RulePreviewOptions = {},
): RulePreviewItem[] {
  const occurrences = Math.max(1, options.occurrences ?? 3);
  const now = options.now ?? new Date();
  const initialDate = options.startDateOverride ?? parseIsoDate(rule.nextDueDate ?? rule.startDate);
  if (!initialDate) {
    return [];
  }

  const items: RulePreviewItem[] = [];
  let currentDue = new Date(initialDate);

  for (let i = 0; i < occurrences; i += 1) {
    const dueIso = toISODate(currentDue);
    const leadTimeStart = toISODate(addDays(currentDue, -rule.leadTimeDays));
    items.push({
      dueDate: dueIso,
      leadTimeStart,
      isPast: currentDue.getTime() < now.getTime(),
    });

    const nextDue = calculateNextDueDate(rule.intervalType, rule.intervalValue, currentDue);
    if (!nextDue) {
      break;
    }
    const parsedNext = parseIsoDate(nextDue);
    if (!parsedNext) {
      break;
    }
    currentDue = parsedNext;
  }

  return items;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toISODate(date: Date): ISODate {
  return date.toISOString().split('T')[0] as ISODate;
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getRescheduleMode(rule: MaintenanceRule): MaintenanceRescheduleMode {
  return (rule.rescheduleMode ?? 'actual-completion') as MaintenanceRescheduleMode;
}
