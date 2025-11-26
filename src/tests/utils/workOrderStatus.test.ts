import { describe, it, expect } from 'vitest';
import {
  isScheduled,
  isActive,
  isWithinLeadTime,
  getWorkOrderStatus,
} from '../../utils/workOrderStatus';
import type { WorkOrder } from '../../types/maintenance';
import type { ISODate, UUID } from '../../types/entities';

// Helper to create a mock work order
function createMockWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1' as UUID,
    workOrderNumber: 'WO-20250101-0001',
    type: 'internal',
    orderType: 'planned',
    state: 'backlog',
    leadTimeDays: 7,
    lineItems: [{ assetId: 'asset-1' as UUID, completionStatus: 'pending' }],
    history: [],
    createdBy: 'user-1' as UUID,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('workOrderStatus utilities (T6.2.2)', () => {
  describe('isScheduled', () => {
    it('should return true for scheduled work orders', () => {
      const wo = createMockWorkOrder({ state: 'scheduled' });
      expect(isScheduled(wo)).toBe(true);
    });

    it('should return false for non-scheduled work orders', () => {
      const states = ['backlog', 'assigned', 'planned', 'in-progress', 'completed', 'done', 'aborted', 'obsolete'];
      for (const state of states) {
        const wo = createMockWorkOrder({ state: state as WorkOrder['state'] });
        expect(isScheduled(wo)).toBe(false);
      }
    });
  });

  describe('isActive', () => {
    it('should return true for active work orders', () => {
      const activeStates = ['backlog', 'assigned', 'planned', 'in-progress', 'offer-requested', 'offer-received'];
      for (const state of activeStates) {
        const wo = createMockWorkOrder({ state: state as WorkOrder['state'] });
        expect(isActive(wo)).toBe(true);
      }
    });

    it('should return false for scheduled work orders', () => {
      const wo = createMockWorkOrder({ state: 'scheduled' });
      expect(isActive(wo)).toBe(false);
    });

    it('should return false for terminal work orders', () => {
      const terminalStates = ['done', 'aborted', 'obsolete', 'completed'];
      for (const state of terminalStates) {
        const wo = createMockWorkOrder({ state: state as WorkOrder['state'] });
        expect(isActive(wo)).toBe(false);
      }
    });
  });

  describe('isWithinLeadTime', () => {
    it('should return true when current date is within lead time window', () => {
      const wo = createMockWorkOrder({
        state: 'scheduled',
        scheduledStart: '2025-01-15' as ISODate, // Work starts on Jan 15
        leadTimeDays: 7, // Lead time is 7 days
      });
      
      // On Jan 8 (exactly 7 days before), should be within lead time
      const jan8 = new Date('2025-01-08T00:00:00.000Z');
      expect(isWithinLeadTime(wo, jan8)).toBe(true);
      
      // On Jan 10 (5 days before), should be within lead time
      const jan10 = new Date('2025-01-10T00:00:00.000Z');
      expect(isWithinLeadTime(wo, jan10)).toBe(true);
      
      // On Jan 15 (scheduled start), should be within lead time
      const jan15 = new Date('2025-01-15T00:00:00.000Z');
      expect(isWithinLeadTime(wo, jan15)).toBe(true);
    });

    it('should return false when current date is before lead time window', () => {
      const wo = createMockWorkOrder({
        state: 'scheduled',
        scheduledStart: '2025-01-15' as ISODate,
        leadTimeDays: 7,
      });
      
      // On Jan 7 (8 days before), should NOT be within lead time
      const jan7 = new Date('2025-01-07T00:00:00.000Z');
      expect(isWithinLeadTime(wo, jan7)).toBe(false);
    });

    it('should return false when no scheduledStart', () => {
      const wo = createMockWorkOrder({
        state: 'scheduled',
        scheduledStart: undefined,
        leadTimeDays: 7,
      });
      
      const now = new Date('2025-01-10T00:00:00.000Z');
      expect(isWithinLeadTime(wo, now)).toBe(false);
    });

    it('should default to current date if not provided', () => {
      const wo = createMockWorkOrder({
        state: 'scheduled',
        // Set a scheduled start far in the future
        scheduledStart: '2099-01-15' as ISODate,
        leadTimeDays: 7,
      });
      
      // Without passing now, it should use current date
      expect(isWithinLeadTime(wo)).toBe(false);
    });
  });

  describe('getWorkOrderStatus', () => {
    it('should return "scheduled" for scheduled work orders', () => {
      const wo = createMockWorkOrder({ state: 'scheduled' });
      expect(getWorkOrderStatus(wo)).toBe('scheduled');
    });

    it('should return "overdue" for past-due active work orders', () => {
      const wo = createMockWorkOrder({
        state: 'backlog',
        scheduledEnd: '2025-01-01' as ISODate,
      });
      
      const jan10 = new Date('2025-01-10T00:00:00.000Z');
      expect(getWorkOrderStatus(wo, jan10)).toBe('overdue');
    });

    it('should return "active" for active work orders not overdue', () => {
      const wo = createMockWorkOrder({
        state: 'in-progress',
        scheduledEnd: '2025-01-31' as ISODate,
      });
      
      const jan10 = new Date('2025-01-10T00:00:00.000Z');
      expect(getWorkOrderStatus(wo, jan10)).toBe('active');
    });

    it('should return "completed" for completed/done work orders', () => {
      const wo = createMockWorkOrder({ state: 'done' });
      expect(getWorkOrderStatus(wo)).toBe('completed');
      
      const wo2 = createMockWorkOrder({ state: 'completed' });
      expect(getWorkOrderStatus(wo2)).toBe('completed');
    });

    it('should return "cancelled" for aborted/obsolete work orders', () => {
      const wo = createMockWorkOrder({ state: 'aborted' });
      expect(getWorkOrderStatus(wo)).toBe('cancelled');
      
      const wo2 = createMockWorkOrder({ state: 'obsolete' });
      expect(getWorkOrderStatus(wo2)).toBe('cancelled');
    });
  });
});
