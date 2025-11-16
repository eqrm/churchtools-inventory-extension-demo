import { createMachine, assign } from 'xstate';
import type { ExternalWorkOrderState, WorkOrder, WorkOrderHistoryEntry, WorkOrderOffer } from '../../types/maintenance';
import type { UUID } from '../../types/entities';

/**
 * External Work Order State Machine (T141)
 * 
 * State Transitions:
 * - backlog → offer-requested (requires companyId)
 * - offer-requested → offer-received (requires offers.length >= 1)
 * - offer-received → planned (requires scheduledStart)
 * - planned → in-progress (sets actualStart)
 * - in-progress → completed (requires actualEnd, all assets completed)
 * - completed → done (requires approvalResponsibleId)
 * - Any state → aborted (terminal)
 * - Any state → obsolete (terminal)
 * - offer-received → offer-requested (request more offers)
 * - completed → in-progress (reopen allowed)
 * 
 * Guards validate prerequisites before allowing transitions.
 * Actions update context and record state history.
 */

export interface ExternalWorkOrderContext {
  workOrder: Partial<WorkOrder>;
}

export type ExternalWorkOrderEvent =
  | { type: 'REQUEST_OFFER'; companyId: UUID }
  | { type: 'RECEIVE_OFFER'; offer: Omit<WorkOrderOffer, 'receivedAt'> & { receivedAt?: string } }
  | { type: 'PLAN'; scheduledStart: string }
  | { type: 'START' }
  | { type: 'COMPLETE'; actualEnd: string }
  | { type: 'APPROVE' }
  | { type: 'ABORT' }
  | { type: 'MARK_OBSOLETE' }
  | { type: 'REQUEST_MORE_OFFERS' }
  | { type: 'REOPEN' };

export const externalWorkOrderMachine = createMachine(
  {
    id: 'externalWorkOrder',
    types: {} as {
      context: ExternalWorkOrderContext;
      events: ExternalWorkOrderEvent;
    },
    context: ({ input }: { input: ExternalWorkOrderContext }) => input,
    initial: 'backlog',
    states: {
      backlog: {
        on: {
          REQUEST_OFFER: {
            target: 'offer-requested',
            guard: 'hasCompanyId',
            actions: ['setCompanyId', 'recordStateChange'],
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
      'offer-requested': {
        on: {
          RECEIVE_OFFER: {
            target: 'offer-received',
            guard: 'hasValidOffer',
            actions: ['addOffer', 'recordStateChange'],
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
      'offer-received': {
        on: {
          PLAN: {
            target: 'planned',
            guard: 'canPlan',
            actions: ['setScheduledStart', 'recordStateChange'],
          },
          REQUEST_MORE_OFFERS: {
            target: 'offer-requested',
            actions: 'recordStateChange',
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
      hasCompanyId: ({ event }) => {
        return event.type === 'REQUEST_OFFER' && !!event.companyId && event.companyId.length > 0;
      },
      hasValidOffer: ({ event }) => {
        return (
          event.type === 'RECEIVE_OFFER' &&
          !!event.offer &&
          !!event.offer.companyId &&
          event.offer.companyId.length > 0 &&
          event.offer.amount > 0
        );
      },
      canPlan: ({ context, event }) => {
        if (event.type !== 'PLAN') return false;
        if (!event.scheduledStart || event.scheduledStart.length === 0) return false;

        // Must have at least one offer
        const offers = context.workOrder.offers || [];
        return offers.length > 0;
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
      setCompanyId: assign(({ context, event }) => {
        if (event.type !== 'REQUEST_OFFER') return context;
        return {
          workOrder: {
            ...context.workOrder,
            companyId: event.companyId,
          },
        };
      }),
      addOffer: assign(({ context, event }) => {
        if (event.type !== 'RECEIVE_OFFER') return context;
        const currentOffers = context.workOrder.offers || [];
        
        // Add receivedAt timestamp if not provided
        const offer: WorkOrderOffer = {
          ...event.offer,
          receivedAt: event.offer.receivedAt || new Date().toISOString(),
        };

        return {
          workOrder: {
            ...context.workOrder,
            offers: [...currentOffers, offer],
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
          changedBy: (context.workOrder.companyId || 'system') as UUID,
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
function getTargetState(eventType: string): ExternalWorkOrderState | null {
  const stateMap: Record<string, ExternalWorkOrderState> = {
    REQUEST_OFFER: 'offer-requested',
    RECEIVE_OFFER: 'offer-received',
    PLAN: 'planned',
    START: 'in-progress',
    COMPLETE: 'completed',
    APPROVE: 'done',
    ABORT: 'aborted',
    MARK_OBSOLETE: 'obsolete',
    REQUEST_MORE_OFFERS: 'offer-requested',
    REOPEN: 'in-progress',
  };
  return stateMap[eventType] || null;
}
