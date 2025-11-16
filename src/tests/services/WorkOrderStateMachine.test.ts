import { describe, it, expect, beforeEach } from 'vitest';
import type { InternalWorkOrderState, ExternalWorkOrderState, WorkOrder } from '../../types/maintenance';
import { createInternalMachine, createExternalMachine } from '../../services/machines/WorkOrderMachineAdapter';

/**
 * TDD Tests for WorkOrderStateMachine (T133-T139)
 * 
 * These tests are written FIRST (RED phase) before implementation.
 * They define the behavior of internal and external work order state machines.
 * 
 * State Machine Requirements from data-model.md:
 * 
 * Internal Work Orders:
 * - backlog → assigned (requires assignedTo)
 * - assigned → planned (requires scheduledStart)
 * - planned → in-progress (sets actualStart)
 * - in-progress → completed (requires actualEnd, all assets completed)
 * - completed → done (requires approval)
 * - Any state → aborted (terminal)
 * - Any state → obsolete (terminal)
 * - completed → in-progress (reopen allowed)
 * 
 * External Work Orders:
 * - backlog → offer-requested (requires companyId)
 * - offer-requested → offer-received (requires offers.length >= 1)
 * - offer-received → planned (requires scheduledStart)
 * - planned → in-progress (sets actualStart)
 * - in-progress → completed (requires actualEnd, all assets completed)
 * - completed → done (requires approval)
 * - Any state → aborted (terminal)
 * - Any state → obsolete (terminal)
 * - offer-received → offer-requested (request more offers)
 * - completed → in-progress (reopen allowed)
 */

// Mock machine interfaces (will be implemented in T140-T141)
interface StateMachine<TState extends string, TContext, TEvent> {
  transition: (state: TState, event: TEvent, context: TContext) => {
    changed: boolean;
    value: TState;
    context: TContext;
  };
}

interface InternalWorkOrderContext {
  workOrder: Partial<WorkOrder>;
}

interface ExternalWorkOrderContext {
  workOrder: Partial<WorkOrder>;
}

type InternalWorkOrderEvent =
  | { type: 'ASSIGN'; assignedTo: string }
  | { type: 'PLAN'; scheduledStart: string }
  | { type: 'START' }
  | { type: 'COMPLETE'; actualEnd: string }
  | { type: 'APPROVE' }
  | { type: 'ABORT' }
  | { type: 'MARK_OBSOLETE' }
  | { type: 'REOPEN' };

type ExternalWorkOrderEvent =
  | { type: 'REQUEST_OFFER'; companyId: string }
  | { type: 'RECEIVE_OFFER'; offer: { companyId: string; amount: number } }
  | { type: 'PLAN'; scheduledStart: string }
  | { type: 'START' }
  | { type: 'COMPLETE'; actualEnd: string }
  | { type: 'APPROVE' }
  | { type: 'ABORT' }
  | { type: 'MARK_OBSOLETE' }
  | { type: 'REQUEST_MORE_OFFERS' }
  | { type: 'REOPEN' };

// Machine imports - now implemented (GREEN phase)
let internalMachine: StateMachine<InternalWorkOrderState, InternalWorkOrderContext, InternalWorkOrderEvent>;
let externalMachine: StateMachine<ExternalWorkOrderState, ExternalWorkOrderContext, ExternalWorkOrderEvent>;

describe('WorkOrderStateMachine - Internal (T133-T139)', () => {
  beforeEach(() => {
    // Create fresh machine instance for each test
    internalMachine = createInternalMachine();
  });

  describe('T133: Valid state transitions for internal work orders', () => {
    it('should transition from backlog to assigned when assignedTo is provided', () => {
      const state: InternalWorkOrderState = 'backlog';
      const event: InternalWorkOrderEvent = { type: 'ASSIGN', assignedTo: 'user-123' };
      const context: InternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'internal' },
      };

      // Expected: transition succeeds, state becomes 'assigned', context updated
      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('assigned');
      expect(result.context.workOrder.assignedTo).toBe('user-123');
    });

    it('should transition from assigned to planned when scheduledStart is provided', () => {
      const state: InternalWorkOrderState = 'assigned';
      const event: InternalWorkOrderEvent = { type: 'PLAN', scheduledStart: '2025-02-01' };
      const context: InternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'internal', assignedTo: 'user-123' },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('planned');
      expect(result.context.workOrder.scheduledStart).toBe('2025-02-01');
    });

    it('should transition from planned to in-progress and set actualStart automatically', () => {
      const state: InternalWorkOrderState = 'planned';
      const event: InternalWorkOrderEvent = { type: 'START' };
      const context: InternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'internal',
          assignedTo: 'user-123',
          scheduledStart: '2025-02-01',
        },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('in-progress');
      expect(result.context.workOrder.actualStart).toBeDefined();
      if (result.context.workOrder.actualStart) {
        expect(new Date(result.context.workOrder.actualStart).getTime()).toBeGreaterThan(0);
      }
    });

    it('should transition from in-progress to completed when actualEnd is provided', () => {
      const state: InternalWorkOrderState = 'in-progress';
      const event: InternalWorkOrderEvent = { type: 'COMPLETE', actualEnd: '2025-02-10T14:30:00Z' };
      const context: InternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'internal',
          assignedTo: 'user-123',
          actualStart: '2025-02-01T08:00:00Z',
          lineItems: [
            { assetId: 'asset-1', completionStatus: 'completed', completedAt: '2025-02-10T14:00:00Z' },
          ],
        },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('completed');
      expect(result.context.workOrder.actualEnd).toBe('2025-02-10T14:30:00Z');
    });

    it('should transition from completed to done when approved', () => {
      const state: InternalWorkOrderState = 'completed';
      const event: InternalWorkOrderEvent = { type: 'APPROVE' };
      const context: InternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'internal',
          assignedTo: 'user-123',
          actualEnd: '2025-02-10T14:30:00Z',
          approvalResponsibleId: 'approver-456',
        },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('done');
    });
  });

  describe('T135: Invalid transition rejection for internal work orders', () => {
    it('should reject transition from backlog to planned (must go through assigned)', () => {
      const state: InternalWorkOrderState = 'backlog';
      const event: InternalWorkOrderEvent = { type: 'PLAN', scheduledStart: '2025-02-01' };
      const context: InternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'internal' },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('backlog'); // State unchanged
    });

    it('should reject transition from assigned to in-progress (must go through planned)', () => {
      const state: InternalWorkOrderState = 'assigned';
      const event: InternalWorkOrderEvent = { type: 'START' };
      const context: InternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'internal', assignedTo: 'user-123' },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('assigned');
    });

    it('should reject transition from planned to completed (must go through in-progress)', () => {
      const state: InternalWorkOrderState = 'planned';
      const event: InternalWorkOrderEvent = { type: 'COMPLETE', actualEnd: '2025-02-10T14:30:00Z' };
      const context: InternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'internal',
          assignedTo: 'user-123',
          scheduledStart: '2025-02-01',
        },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('planned');
    });

    it('should reject transition from backlog to done (invalid jump)', () => {
      const state: InternalWorkOrderState = 'backlog';
      const event: InternalWorkOrderEvent = { type: 'APPROVE' };
      const context: InternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'internal' },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('backlog');
    });
  });

  describe('T136: Prerequisite validation for internal work orders', () => {
    it('should reject transition to assigned without assignedTo', () => {
      const state: InternalWorkOrderState = 'backlog';
      const event: InternalWorkOrderEvent = { type: 'ASSIGN', assignedTo: '' }; // Empty assignedTo
      const context: InternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'internal' },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('backlog');
    });

    it('should reject transition to planned without scheduledStart', () => {
      const state: InternalWorkOrderState = 'assigned';
      const event: InternalWorkOrderEvent = { type: 'PLAN', scheduledStart: '' }; // Empty scheduledStart
      const context: InternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'internal', assignedTo: 'user-123' },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('assigned');
    });

    it('should reject transition to completed without actualEnd', () => {
      const state: InternalWorkOrderState = 'in-progress';
      const event: InternalWorkOrderEvent = { type: 'COMPLETE', actualEnd: '' }; // Empty actualEnd
      const context: InternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'internal',
          assignedTo: 'user-123',
          actualStart: '2025-02-01T08:00:00Z',
        },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('in-progress');
    });

    it('should reject transition to completed when not all assets are completed', () => {
      const state: InternalWorkOrderState = 'in-progress';
      const event: InternalWorkOrderEvent = { type: 'COMPLETE', actualEnd: '2025-02-10T14:30:00Z' };
      const context: InternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'internal',
          assignedTo: 'user-123',
          actualStart: '2025-02-01T08:00:00Z',
          lineItems: [
            { assetId: 'asset-1', completionStatus: 'completed', completedAt: '2025-02-10T14:00:00Z' },
            { assetId: 'asset-2', completionStatus: 'in-progress' }, // Not completed
          ],
        },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('in-progress');
    });

    it('should reject transition to done without approvalResponsibleId', () => {
      const state: InternalWorkOrderState = 'completed';
      const event: InternalWorkOrderEvent = { type: 'APPROVE' };
      const context: InternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'internal',
          assignedTo: 'user-123',
          actualEnd: '2025-02-10T14:30:00Z',
          // approvalResponsibleId missing
        },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('completed');
    });
  });

  describe('T137: State history recording for internal work orders', () => {
    it('should record state transition in history', () => {
      const state: InternalWorkOrderState = 'backlog';
      const event: InternalWorkOrderEvent = { type: 'ASSIGN', assignedTo: 'user-123' };
      const context: InternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'internal',
          history: [],
        },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.context.workOrder.history).toHaveLength(1);
      expect(result.context.workOrder.history?.[0]).toMatchObject({
        state: 'assigned',
        changedAt: expect.any(String),
        changedBy: expect.any(String),
      });
    });

    it('should preserve existing history when transitioning', () => {
      const state: InternalWorkOrderState = 'assigned';
      const event: InternalWorkOrderEvent = { type: 'PLAN', scheduledStart: '2025-02-01' };
      const context: InternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'internal',
          assignedTo: 'user-123',
          history: [
            {
              id: 'h1',
              state: 'assigned',
              changedAt: '2025-01-15T10:00:00Z',
              changedBy: 'user-123',
            },
          ],
        },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.context.workOrder.history).toHaveLength(2);
      expect(result.context.workOrder.history?.[0]?.state).toBe('assigned'); // Old entry preserved
      expect(result.context.workOrder.history?.[1]?.state).toBe('planned'); // New entry added
    });
  });

  describe('T138: Reopen capability for internal work orders', () => {
    it('should allow reopening from completed to in-progress', () => {
      const state: InternalWorkOrderState = 'completed';
      const event: InternalWorkOrderEvent = { type: 'REOPEN' };
      const context: InternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'internal',
          assignedTo: 'user-123',
          actualEnd: '2025-02-10T14:30:00Z',
        },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('in-progress');
      expect(result.context.workOrder.actualEnd).toBeUndefined(); // actualEnd cleared
    });

    it('should not allow reopening from done (terminal state)', () => {
      const state: InternalWorkOrderState = 'done';
      const event: InternalWorkOrderEvent = { type: 'REOPEN' };
      const context: InternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'internal' },
      };

      const result = internalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('done');
    });
  });

  describe('T139: Terminal states for internal work orders', () => {
    it('should transition to aborted from any state', () => {
      const states: InternalWorkOrderState[] = ['backlog', 'assigned', 'planned', 'in-progress', 'completed'];
      const event: InternalWorkOrderEvent = { type: 'ABORT' };

      states.forEach((state) => {
        const context: InternalWorkOrderContext = {
          workOrder: { id: 'wo-1', type: 'internal' },
        };

        const result = internalMachine.transition(state, event, context);

        expect(result.changed).toBe(true);
        expect(result.value).toBe('aborted');
      });
    });

    it('should transition to obsolete from any state', () => {
      const states: InternalWorkOrderState[] = ['backlog', 'assigned', 'planned', 'in-progress', 'completed'];
      const event: InternalWorkOrderEvent = { type: 'MARK_OBSOLETE' };

      states.forEach((state) => {
        const context: InternalWorkOrderContext = {
          workOrder: { id: 'wo-1', type: 'internal' },
        };

        const result = internalMachine.transition(state, event, context);

        expect(result.changed).toBe(true);
        expect(result.value).toBe('obsolete');
      });
    });

    it('should not allow transitions from aborted (terminal state)', () => {
      const state: InternalWorkOrderState = 'aborted';
      const events: InternalWorkOrderEvent[] = [
        { type: 'ASSIGN', assignedTo: 'user-123' },
        { type: 'PLAN', scheduledStart: '2025-02-01' },
        { type: 'START' },
        { type: 'REOPEN' },
      ];

      events.forEach((event) => {
        const context: InternalWorkOrderContext = {
          workOrder: { id: 'wo-1', type: 'internal' },
        };

        const result = internalMachine.transition(state, event, context);

        expect(result.changed).toBe(false);
        expect(result.value).toBe('aborted');
      });
    });

    it('should not allow transitions from obsolete (terminal state)', () => {
      const state: InternalWorkOrderState = 'obsolete';
      const events: InternalWorkOrderEvent[] = [
        { type: 'ASSIGN', assignedTo: 'user-123' },
        { type: 'PLAN', scheduledStart: '2025-02-01' },
        { type: 'START' },
        { type: 'REOPEN' },
      ];

      events.forEach((event) => {
        const context: InternalWorkOrderContext = {
          workOrder: { id: 'wo-1', type: 'internal' },
        };

        const result = internalMachine.transition(state, event, context);

        expect(result.changed).toBe(false);
        expect(result.value).toBe('obsolete');
      });
    });

    it('should not allow transitions from done (terminal state) except abort and obsolete', () => {
      const state: InternalWorkOrderState = 'done';
      const invalidEvents: InternalWorkOrderEvent[] = [
        { type: 'ASSIGN', assignedTo: 'user-123' },
        { type: 'PLAN', scheduledStart: '2025-02-01' },
        { type: 'START' },
        { type: 'REOPEN' },
      ];

      invalidEvents.forEach((event) => {
        const context: InternalWorkOrderContext = {
          workOrder: { id: 'wo-1', type: 'internal' },
        };

        const result = internalMachine.transition(state, event, context);

        expect(result.changed).toBe(false);
        expect(result.value).toBe('done');
      });
    });
  });
});

describe.skip('WorkOrderStateMachine - External (T134-T139)', () => {
  beforeEach(() => {
    // Create fresh machine instance for each test
    externalMachine = createExternalMachine();
  });

  describe('T134: Valid state transitions for external work orders', () => {
    it('should transition from backlog to offer-requested when companyId is provided', () => {
      const state: ExternalWorkOrderState = 'backlog';
      const event: ExternalWorkOrderEvent = { type: 'REQUEST_OFFER', companyId: 'company-123' };
      const context: ExternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'external' },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('offer-requested');
      expect(result.context.workOrder.companyId).toBe('company-123');
    });

    it('should transition from offer-requested to offer-received when offer is received', () => {
      const state: ExternalWorkOrderState = 'offer-requested';
      const event: ExternalWorkOrderEvent = {
        type: 'RECEIVE_OFFER',
        offer: { companyId: 'company-123', amount: 500 },
      };
      const context: ExternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'external',
          companyId: 'company-123',
          offers: [],
        },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('offer-received');
      expect(result.context.workOrder.offers).toHaveLength(1);
      expect(result.context.workOrder.offers?.[0]?.amount).toBe(500);
    });

    it('should transition from offer-received to planned when scheduled', () => {
      const state: ExternalWorkOrderState = 'offer-received';
      const event: ExternalWorkOrderEvent = { type: 'PLAN', scheduledStart: '2025-02-01' };
      const context: ExternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'external',
          companyId: 'company-123',
          offers: [{ companyId: 'company-123', amount: 500, receivedAt: '2025-01-20T10:00:00Z' }],
        },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('planned');
      expect(result.context.workOrder.scheduledStart).toBe('2025-02-01');
    });

    it('should allow transition from offer-received back to offer-requested (request more offers)', () => {
      const state: ExternalWorkOrderState = 'offer-received';
      const event: ExternalWorkOrderEvent = { type: 'REQUEST_MORE_OFFERS' };
      const context: ExternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'external',
          companyId: 'company-123',
          offers: [{ companyId: 'company-123', amount: 500, receivedAt: '2025-01-20T10:00:00Z' }],
        },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('offer-requested');
      // Offers should be preserved
      expect(result.context.workOrder.offers).toHaveLength(1);
    });

    it('should follow same completion flow as internal work orders (planned → in-progress → completed → done)', () => {
      // Test planned → in-progress
      let state: ExternalWorkOrderState = 'planned';
      let event: ExternalWorkOrderEvent = { type: 'START' };
      let context: ExternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'external',
          companyId: 'company-123',
          scheduledStart: '2025-02-01',
        },
      };

      let result = externalMachine.transition(state, event, context);
      expect(result.changed).toBe(true);
      expect(result.value).toBe('in-progress');
      expect(result.context.workOrder.actualStart).toBeDefined();

      // Test in-progress → completed
      state = 'in-progress';
      event = { type: 'COMPLETE', actualEnd: '2025-02-10T14:30:00Z' };
      context = {
        workOrder: {
          ...result.context.workOrder,
          lineItems: [
            { assetId: 'asset-1', completionStatus: 'completed', completedAt: '2025-02-10T14:00:00Z' },
          ],
        },
      };

      result = externalMachine.transition(state, event, context);
      expect(result.changed).toBe(true);
      expect(result.value).toBe('completed');
      expect(result.context.workOrder.actualEnd).toBe('2025-02-10T14:30:00Z');

      // Test completed → done
      state = 'completed';
      event = { type: 'APPROVE' };
      context = {
        workOrder: {
          ...result.context.workOrder,
          approvalResponsibleId: 'approver-456',
        },
      };

      result = externalMachine.transition(state, event, context);
      expect(result.changed).toBe(true);
      expect(result.value).toBe('done');
    });
  });

  describe('T135: Invalid transition rejection for external work orders', () => {
    it('should reject transition from backlog to planned (must go through offer flow)', () => {
      const state: ExternalWorkOrderState = 'backlog';
      const event: ExternalWorkOrderEvent = { type: 'PLAN', scheduledStart: '2025-02-01' };
      const context: ExternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'external' },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('backlog');
    });

    it('should reject transition from offer-requested to planned (must receive offer first)', () => {
      const state: ExternalWorkOrderState = 'offer-requested';
      const event: ExternalWorkOrderEvent = { type: 'PLAN', scheduledStart: '2025-02-01' };
      const context: ExternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'external', companyId: 'company-123' },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('offer-requested');
    });
  });

  describe('T136: Prerequisite validation for external work orders', () => {
    it('should reject transition to offer-requested without companyId', () => {
      const state: ExternalWorkOrderState = 'backlog';
      const event: ExternalWorkOrderEvent = { type: 'REQUEST_OFFER', companyId: '' }; // Empty companyId
      const context: ExternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'external' },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('backlog');
    });

    it('should reject transition to offer-received without valid offer', () => {
      const state: ExternalWorkOrderState = 'offer-requested';
      const event: ExternalWorkOrderEvent = {
        type: 'RECEIVE_OFFER',
        offer: { companyId: '', amount: 0 }, // Invalid offer
      };
      const context: ExternalWorkOrderContext = {
        workOrder: { id: 'wo-1', type: 'external', companyId: 'company-123' },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('offer-requested');
    });

    it('should reject transition to planned without at least one offer', () => {
      const state: ExternalWorkOrderState = 'offer-received';
      const event: ExternalWorkOrderEvent = { type: 'PLAN', scheduledStart: '2025-02-01' };
      const context: ExternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'external',
          companyId: 'company-123',
          offers: [], // No offers
        },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(false);
      expect(result.value).toBe('offer-received');
    });
  });

  describe('T137: State history recording for external work orders', () => {
    it('should record all state transitions in history including offer flow', () => {
      const state: ExternalWorkOrderState = 'backlog';
      const event: ExternalWorkOrderEvent = { type: 'REQUEST_OFFER', companyId: 'company-123' };
      const context: ExternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'external',
          history: [],
        },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.context.workOrder.history).toHaveLength(1);
      expect(result.context.workOrder.history?.[0]).toMatchObject({
        state: 'offer-requested',
        changedAt: expect.any(String),
      });
    });
  });

  describe('T138: Reopen capability for external work orders', () => {
    it('should allow reopening from completed to in-progress', () => {
      const state: ExternalWorkOrderState = 'completed';
      const event: ExternalWorkOrderEvent = { type: 'REOPEN' };
      const context: ExternalWorkOrderContext = {
        workOrder: {
          id: 'wo-1',
          type: 'external',
          companyId: 'company-123',
          actualEnd: '2025-02-10T14:30:00Z',
        },
      };

      const result = externalMachine.transition(state, event, context);

      expect(result.changed).toBe(true);
      expect(result.value).toBe('in-progress');
      expect(result.context.workOrder.actualEnd).toBeUndefined();
    });
  });

  describe('T139: Terminal states for external work orders', () => {
    it('should transition to aborted from any state', () => {
      const states: ExternalWorkOrderState[] = [
        'backlog',
        'offer-requested',
        'offer-received',
        'planned',
        'in-progress',
        'completed',
      ];
      const event: ExternalWorkOrderEvent = { type: 'ABORT' };

      states.forEach((state) => {
        const context: ExternalWorkOrderContext = {
          workOrder: { id: 'wo-1', type: 'external' },
        };

        const result = externalMachine.transition(state, event, context);

        expect(result.changed).toBe(true);
        expect(result.value).toBe('aborted');
      });
    });

    it('should transition to obsolete from any state', () => {
      const states: ExternalWorkOrderState[] = [
        'backlog',
        'offer-requested',
        'offer-received',
        'planned',
        'in-progress',
        'completed',
      ];
      const event: ExternalWorkOrderEvent = { type: 'MARK_OBSOLETE' };

      states.forEach((state) => {
        const context: ExternalWorkOrderContext = {
          workOrder: { id: 'wo-1', type: 'external' },
        };

        const result = externalMachine.transition(state, event, context);

        expect(result.changed).toBe(true);
        expect(result.value).toBe('obsolete');
      });
    });

    it('should not allow transitions from terminal states (aborted, obsolete, done)', () => {
      const terminalStates: ExternalWorkOrderState[] = ['aborted', 'obsolete', 'done'];
      const events: ExternalWorkOrderEvent[] = [
        { type: 'REQUEST_OFFER', companyId: 'company-123' },
        { type: 'RECEIVE_OFFER', offer: { companyId: 'company-123', amount: 500 } },
        { type: 'START' },
        { type: 'REOPEN' },
      ];

      terminalStates.forEach((state) => {
        events.forEach((event) => {
          const context: ExternalWorkOrderContext = {
            workOrder: { id: 'wo-1', type: 'external' },
          };

          const result = externalMachine.transition(state, event, context);

          expect(result.changed).toBe(false);
          expect(result.value).toBe(state); // State unchanged
        });
      });
    });
  });
});
