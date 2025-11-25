import { createMachine, assign } from 'xstate';
import type { InternalWorkOrderState, WorkOrder, WorkOrderHistoryEntry } from '../../types/maintenance';
import type { UUID } from '../../types/entities';

/**
 * Internal Work Order State Machine (T140)
 * 
 * State Transitions:
 * - backlog → assigned (requires assignedTo)
 * - assigned → planned (requires scheduledStart)
 * - planned → in-progress (sets actualStart)
 * - in-progress → completed (requires actualEnd, all assets completed)
 * - completed → done (requires approvalResponsibleId)
 * - Any state → aborted (terminal)
 * - Any state → obsolete (terminal)
 * - completed → in-progress (reopen allowed)
 * 
 * Guards validate prerequisites before allowing transitions.
 * Actions update context and record state history.
 */

export interface InternalWorkOrderContext {
  workOrder: Partial<WorkOrder>;
}

export type InternalWorkOrderEvent =
  | { type: 'ASSIGN'; assignedTo: UUID }
  | { type: 'PLAN'; scheduledStart: string }
  | { type: 'START' }
  | { type: 'COMPLETE'; actualEnd: string }
  | { type: 'APPROVE' }
  | { type: 'ABORT' }
  | { type: 'MARK_OBSOLETE' }
  | { type: 'REOPEN' };

export const internalWorkOrderMachine = createMachine(
  {
    id: 'internalWorkOrder',
    types: {} as {
      context: InternalWorkOrderContext;
      events: InternalWorkOrderEvent;
    },
    context: ({ input }: { input: InternalWorkOrderContext }) => input,
    initial: 'backlog',
    states: {
      backlog: {
        on: {
          ASSIGN: {
            target: 'assigned',
            guard: 'hasAssignedTo',
            actions: ['assignUser', 'recordStateChange'],
          },
          ABORT: {
            target: 'aborted',
            actions: 'recordStateChange',
          },
          MARK_OBSOLETE: {
            target: 'obsolete',
            actions: 'recordStateChange',
          },
        },
      },
      assigned: {
        on: {
          PLAN: {
            target: 'planned',
            guard: 'hasScheduledStart',
            actions: ['setScheduledStart', 'recordStateChange'],
          },
          ABORT: {
            target: 'aborted',
            actions: 'recordStateChange',
          },
          MARK_OBSOLETE: {
            target: 'obsolete',
            actions: 'recordStateChange',
          },
        },
      },
      planned: {
        on: {
          START: {
            target: 'in-progress',
            actions: ['setActualStart', 'recordStateChange'],
          },
          ABORT: {
            target: 'aborted',
            actions: 'recordStateChange',
          },
          MARK_OBSOLETE: {
            target: 'obsolete',
            actions: 'recordStateChange',
          },
        },
      },
      'in-progress': {
        on: {
          COMPLETE: {
            target: 'completed',
            guard: 'canComplete',
            actions: ['setActualEnd', 'recordStateChange'],
          },
          ABORT: {
            target: 'aborted',
            actions: 'recordStateChange',
          },
          MARK_OBSOLETE: {
            target: 'obsolete',
            actions: 'recordStateChange',
          },
        },
      },
      completed: {
        on: {
          APPROVE: {
            target: 'done',
            guard: 'hasApprovalResponsible',
            actions: 'recordStateChange',
          },
          REOPEN: {
            target: 'in-progress',
            actions: ['clearActualEnd', 'recordStateChange'],
          },
          ABORT: {
            target: 'aborted',
            actions: 'recordStateChange',
          },
          MARK_OBSOLETE: {
            target: 'obsolete',
            actions: 'recordStateChange',
          },
        },
      },
      done: {
        type: 'final',
      },
      aborted: {
        type: 'final',
      },
      obsolete: {
        type: 'final',
      },
    },
  },
  {
    guards: {
      hasAssignedTo: ({ event }) => {
        return event.type === 'ASSIGN' && !!event.assignedTo && event.assignedTo.length > 0;
      },
      hasScheduledStart: ({ event }) => {
        return event.type === 'PLAN' && !!event.scheduledStart && event.scheduledStart.length > 0;
      },
      canComplete: ({ context, event }) => {
        if (event.type !== 'COMPLETE') return false;
        if (!event.actualEnd || event.actualEnd.length === 0) return false;

        // Check if all line items are completed
        const lineItems = context.workOrder.lineItems || [];
        return lineItems.every((item) => item.completionStatus === 'completed');
      },
      hasApprovalResponsible: ({ context }) => {
        return !!context.workOrder.approvalResponsibleId;
      },
    },
    actions: {
      assignUser: assign(({ context, event }) => {
        if (event.type !== 'ASSIGN') return context;
        return {
          workOrder: {
            ...context.workOrder,
            assignedTo: event.assignedTo,
          },
        };
      }),
      setScheduledStart: assign(({ context, event }) => {
        if (event.type !== 'PLAN') return context;
        return {
          workOrder: {
            ...context.workOrder,
            scheduledStart: event.scheduledStart,
          },
        };
      }),
      setActualStart: assign(({ context }) => {
        return {
          workOrder: {
            ...context.workOrder,
            actualStart: new Date().toISOString(),
          },
        };
      }),
      setActualEnd: assign(({ context, event }) => {
        if (event.type !== 'COMPLETE') return context;
        return {
          workOrder: {
            ...context.workOrder,
            actualEnd: event.actualEnd,
          },
        };
      }),
      clearActualEnd: assign(({ context }) => {
        const { actualEnd: _actualEnd, ...rest } = context.workOrder;
        return { workOrder: rest };
      }),
      recordStateChange: assign(({ context, event }) => {
        const currentHistory = context.workOrder.history || [];
        const newState = getTargetState(event.type);
        
        if (!newState) return context;

        const historyEntry: WorkOrderHistoryEntry = {
          id: crypto.randomUUID() as UUID,
          state: newState,
          changedAt: new Date().toISOString(),
          changedBy: (context.workOrder.assignedTo || 'system') as UUID,
          changedByName: undefined,
        };

        return {
          workOrder: {
            ...context.workOrder,
            state: newState,
            history: [...currentHistory, historyEntry],
          },
        };
      }),
    },
  },
);

/**
 * Helper function to determine target state from event type
 */
function getTargetState(eventType: string): InternalWorkOrderState | null {
  const stateMap: Record<string, InternalWorkOrderState> = {
    ASSIGN: 'assigned',
    PLAN: 'planned',
    START: 'in-progress',
    COMPLETE: 'completed',
    APPROVE: 'done',
    ABORT: 'aborted',
    MARK_OBSOLETE: 'obsolete',
    REOPEN: 'in-progress',
  };
  return stateMap[eventType] || null;
}
