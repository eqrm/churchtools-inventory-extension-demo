import { describe, expect, it } from 'vitest';
import type { MaintenanceRule, WorkOrder } from '../../../src/types/maintenance';
import type { ISODate, UUID } from '../../../src/types/entities';
import {
  calculateNextDueDate,
  computeScheduleAfterCompletion,
  previewRuleSchedule,
  shouldCreateWorkOrder,
} from '../../../src/services/maintenanceScheduler';

const baseRule: MaintenanceRule = {
  id: 'rule-1' as UUID,
  name: 'Quarterly check',
  workType: 'inspection',
  isInternal: true,
  serviceProviderId: undefined,
  targets: [{ type: 'asset', ids: ['asset-1' as UUID] }],
  intervalType: 'months',
  intervalValue: 3,
  startDate: '2025-01-01',
  nextDueDate: '2025-04-01',
  leadTimeDays: 10,
  rescheduleMode: 'actual-completion',
  createdBy: 'user-1' as UUID,
  createdByName: 'User One',
  createdAt: '2024-12-01T00:00:00Z',
  updatedAt: '2024-12-01T00:00:00Z',
};

describe('maintenanceScheduler.calculateNextDueDate', () => {
  it('adds interval months relative to anchor date', () => {
    const next = calculateNextDueDate('months', 2, new Date('2025-01-15T00:00:00Z'));
    expect(next).toBe('2025-03-15');
  });

  it('returns null for unsupported interval types', () => {
    const next = calculateNextDueDate('uses', 5, new Date());
    expect(next).toBeNull();
  });
});

describe('maintenanceScheduler.shouldCreateWorkOrder', () => {
  const closedOrder: WorkOrder = {
    id: 'wo-1' as UUID,
    workOrderNumber: 'WO-20250101-0001',
    type: 'internal',
    orderType: 'planned',
    state: 'done',
    ruleId: baseRule.id,
    companyId: undefined,
    assignedTo: undefined,
    approvalResponsibleId: undefined,
    leadTimeDays: 10,
    scheduledStart: '2025-01-10',
    scheduledEnd: undefined,
    actualStart: undefined,
    actualEnd: undefined,
    offers: [],
    lineItems: [],
    history: [],
    createdBy: 'user-1' as UUID,
    createdByName: 'User One',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
  };

  it('allows generation when past lead time with no open orders', () => {
    const today = new Date('2025-03-25T00:00:00Z');
    expect(shouldCreateWorkOrder(baseRule, [closedOrder], today)).toBe(true);
  });

  it('blocks generation if an open order exists', () => {
    const openOrder: WorkOrder = { ...closedOrder, id: 'wo-2' as UUID, state: 'in-progress' };
    const today = new Date('2025-03-25T00:00:00Z');
    expect(shouldCreateWorkOrder(baseRule, [openOrder], today)).toBe(false);
  });

  it('blocks when before lead time window', () => {
    const today = new Date('2025-03-15T00:00:00Z');
    expect(shouldCreateWorkOrder(baseRule, [closedOrder], today)).toBe(false);
  });

  it('ignores unrelated rule work orders when checking open states', () => {
    const otherRuleOrder: WorkOrder = {
      ...closedOrder,
      id: 'wo-3' as UUID,
      state: 'in-progress',
      ruleId: 'other-rule' as UUID,
    };
    const today = new Date('2025-03-25T00:00:00Z');
    expect(shouldCreateWorkOrder(baseRule, [otherRuleOrder], today)).toBe(true);
  });
});

describe('maintenanceScheduler.computeScheduleAfterCompletion', () => {
  it('reschedules based on actual completion date', () => {
    const update = computeScheduleAfterCompletion(baseRule, '2025-04-05T12:00:00Z');
    expect(update).toEqual({ nextDueDate: '2025-07-05' });
  });

  it('shifts start date and resets reschedule mode when replan-once is enabled', () => {
    const replanRule: MaintenanceRule = {
      ...baseRule,
      startDate: '2025-01-01',
      nextDueDate: '2025-04-01',
      rescheduleMode: 'replan-once',
    };
    const update = computeScheduleAfterCompletion(replanRule, '2025-04-10T00:00:00Z');
    expect(update).toEqual({
      nextDueDate: '2025-07-19',
      updatedStartDate: '2025-01-10',
      nextRescheduleMode: 'actual-completion',
    });
  });

  it('returns null when completion timestamp is invalid', () => {
    const update = computeScheduleAfterCompletion(baseRule, 'not-a-date');
    expect(update).toBeNull();
  });
});

describe('maintenanceScheduler.previewRuleSchedule', () => {
  it('produces upcoming occurrences with lead time markers', () => {
    const preview = previewRuleSchedule(baseRule, { occurrences: 2, now: new Date('2025-03-20T00:00:00Z') });
    expect(preview).toEqual([
      {
        dueDate: '2025-04-01',
        leadTimeStart: '2025-03-22',
        isPast: false,
      },
      {
        dueDate: '2025-07-01',
        leadTimeStart: '2025-06-21',
        isPast: false,
      },
    ]);
  });

  it('returns empty preview when no due date can be established', () => {
    const preview = previewRuleSchedule({
      ...baseRule,
      nextDueDate: 'invalid-date' as ISODate,
    });
    expect(preview).toEqual([]);
  });

  it('marks occurrences as past when due date precedes now', () => {
    const preview = previewRuleSchedule(baseRule, {
      occurrences: 1,
      now: new Date('2025-08-01T00:00:00Z'),
    });
    expect(preview).toEqual([
      {
        dueDate: '2025-04-01',
        leadTimeStart: '2025-03-22',
        isPast: true,
      },
    ]);
  });

  it('respects explicit start date overrides for previews', () => {
    const overrideStart = new Date('2025-10-15T00:00:00Z');
    const preview = previewRuleSchedule(baseRule, { startDateOverride: overrideStart, occurrences: 1 });
    expect(preview[0]?.dueDate).toBe('2025-10-15');
  });
});
