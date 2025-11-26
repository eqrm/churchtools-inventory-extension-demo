import { describe, it, expect } from 'vitest';
import { generateFutureWorkOrders } from '../../services/workOrderGenerator';
import { MAX_WORK_ORDER_HORIZON_MONTHS } from '../../constants/maintenance';
import type { MaintenanceRule, WorkOrder } from '../../types/maintenance';
import type { ISODate, UUID } from '../../types/entities';

// Helper to create a mock maintenance rule
function createMockRule(overrides: Partial<MaintenanceRule> = {}): MaintenanceRule {
  return {
    id: 'rule-1' as UUID,
    name: 'Test Rule',
    workType: 'maintenance',
    isInternal: true,
    targets: [{ type: 'asset', ids: ['asset-1'] }],
    intervalType: 'months',
    intervalValue: 1,
    startDate: '2025-01-01' as ISODate,
    nextDueDate: '2025-01-01' as ISODate,
    leadTimeDays: 7,
    createdBy: 'user-1' as UUID,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Helper to create a mock work order
function createMockWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1' as UUID,
    workOrderNumber: 'WO-20250101-0001',
    type: 'internal',
    orderType: 'planned',
    state: 'scheduled',
    ruleId: 'rule-1' as UUID,
    leadTimeDays: 7,
    scheduledStart: '2025-01-01' as ISODate,
    lineItems: [{ assetId: 'asset-1' as UUID, completionStatus: 'pending' }],
    history: [],
    createdBy: 'user-1' as UUID,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('workOrderGenerator', () => {
  // Fixed date for consistent testing
  const testNow = new Date('2025-01-01T00:00:00.000Z');

  describe('generateFutureWorkOrders', () => {
    describe('T6.1.2: Generate future work orders from rule', () => {
      it('should generate work orders for monthly rule up to horizon', () => {
        const rule = createMockRule({
          intervalType: 'months',
          intervalValue: 1,
          nextDueDate: '2025-01-01' as ISODate,
        });

        const workOrders = generateFutureWorkOrders(
          rule,
          MAX_WORK_ORDER_HORIZON_MONTHS,
          [],
          { now: testNow },
        );

        // Monthly for 60 months from start date should generate 61 work orders (including first)
        expect(workOrders.length).toBe(61);
        expect(workOrders[0]?.scheduledStart).toBe('2025-01-01');
        expect(workOrders[1]?.scheduledStart).toBe('2025-02-01');
      });

      it('should generate work orders for daily rule with appropriate cap', () => {
        const rule = createMockRule({
          intervalType: 'days',
          intervalValue: 7, // Weekly
          nextDueDate: '2025-01-01' as ISODate,
        });

        const workOrders = generateFutureWorkOrders(rule, 12, [], { now: testNow }); // 12 months = ~1 year

        // Weekly for 1 year = ~52 work orders
        expect(workOrders.length).toBeGreaterThan(50);
        expect(workOrders.length).toBeLessThan(55);
      });

      it('should skip existing work orders for same scheduled date', () => {
        const rule = createMockRule({
          intervalType: 'months',
          intervalValue: 1,
          nextDueDate: '2025-01-01' as ISODate,
        });

        const existingWorkOrders = [
          createMockWorkOrder({
            ruleId: rule.id,
            scheduledStart: '2025-01-01' as ISODate,
          }),
          createMockWorkOrder({
            id: 'wo-2' as UUID,
            ruleId: rule.id,
            scheduledStart: '2025-02-01' as ISODate,
          }),
        ];

        const workOrders = generateFutureWorkOrders(rule, 12, existingWorkOrders, { now: testNow });

        // Should skip the 2 existing ones, 13 months horizon minus 2 = 11
        expect(workOrders.length).toBe(11);
        expect(workOrders[0]?.scheduledStart).toBe('2025-03-01');
      });

      it('should set state to scheduled for all generated work orders', () => {
        const rule = createMockRule({
          intervalType: 'months',
          intervalValue: 6,
          nextDueDate: '2025-01-01' as ISODate,
        });

        const workOrders = generateFutureWorkOrders(rule, 24, [], { now: testNow });

        workOrders.forEach((wo) => {
          expect(wo.state).toBe('scheduled');
        });
      });

      it('should set ruleId for all generated work orders', () => {
        const rule = createMockRule({
          id: 'test-rule-123' as UUID,
        });

        const workOrders = generateFutureWorkOrders(rule, 12, [], { now: testNow });

        workOrders.forEach((wo) => {
          expect(wo.ruleId).toBe('test-rule-123');
        });
      });

      it('should not generate for uses-based interval type', () => {
        const rule = createMockRule({
          intervalType: 'uses',
          intervalValue: 100,
        });

        const workOrders = generateFutureWorkOrders(rule, 60, [], { now: testNow });

        // Uses-based rules cannot be pre-scheduled
        expect(workOrders.length).toBe(0);
      });

      it('should set correct work order type based on rule.isInternal', () => {
        const internalRule = createMockRule({ isInternal: true });
        const externalRule = createMockRule({ isInternal: false });

        const internalWOs = generateFutureWorkOrders(internalRule, 6, [], { now: testNow });
        const externalWOs = generateFutureWorkOrders(externalRule, 6, [], { now: testNow });

        internalWOs.forEach((wo) => expect(wo.type).toBe('internal'));
        externalWOs.forEach((wo) => expect(wo.type).toBe('external'));
      });

      it('should set companyId from rule.serviceProviderId for external rules', () => {
        const rule = createMockRule({
          isInternal: false,
          serviceProviderId: 'company-123' as UUID,
        });

        const workOrders = generateFutureWorkOrders(rule, 6, [], { now: testNow });

        workOrders.forEach((wo) => {
          expect(wo.companyId).toBe('company-123');
        });
      });

      it('should handle rule with no nextDueDate by using startDate', () => {
        const rule = createMockRule({
          startDate: '2025-06-15' as ISODate,
          nextDueDate: undefined as unknown as ISODate,
        });

        const workOrders = generateFutureWorkOrders(rule, 6, [], { now: testNow });

        expect(workOrders[0]?.scheduledStart).toBe('2025-06-15');
      });

      it('should set leadTimeDays from rule', () => {
        const rule = createMockRule({
          leadTimeDays: 14,
        });

        const workOrders = generateFutureWorkOrders(rule, 6, [], { now: testNow });

        workOrders.forEach((wo) => {
          expect(wo.leadTimeDays).toBe(14);
        });
      });

      it('should generate correct number for quarterly interval', () => {
        const rule = createMockRule({
          intervalType: 'months',
          intervalValue: 3, // Quarterly
          nextDueDate: '2025-01-01' as ISODate,
        });

        const workOrders = generateFutureWorkOrders(rule, 24, [], { now: testNow }); // 2 years

        // Quarterly for 2 years = 9 work orders (including start date)
        expect(workOrders.length).toBe(9);
      });

      it('should only skip work orders for the same rule', () => {
        const rule = createMockRule({
          id: 'rule-1' as UUID,
          intervalType: 'months',
          intervalValue: 1,
          nextDueDate: '2025-01-01' as ISODate,
        });

        const existingWorkOrders = [
          createMockWorkOrder({
            ruleId: 'other-rule' as UUID, // Different rule
            scheduledStart: '2025-01-01' as ISODate,
          }),
        ];

        const workOrders = generateFutureWorkOrders(rule, 12, existingWorkOrders, { now: testNow });

        // Should NOT skip the January date since it's for a different rule (13 months including start)
        expect(workOrders.length).toBe(13);
        expect(workOrders[0]?.scheduledStart).toBe('2025-01-01');
      });
    });
  });
});
