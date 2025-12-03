/**
 * Work Order State Machine Utilities (T158)
 * 
 * Helper functions for querying and working with work order state machines.
 */

import { createActor } from 'xstate';
import { internalWorkOrderMachine, type InternalWorkOrderEvent } from './InternalWorkOrderMachine';
import { externalWorkOrderMachine, type ExternalWorkOrderEvent } from './ExternalWorkOrderMachine';
import type { WorkOrder, WorkOrderState, WorkOrderType } from '../../types/maintenance';

/**
 * Get all possible next states for a work order based on its current state.
 */
export function getAvailableTransitions(
  workOrder: WorkOrder
): Array<{ event: string; targetState: WorkOrderState; requiresInput?: string }> {
  const machine = workOrder.type === 'internal' ? internalWorkOrderMachine : externalWorkOrderMachine;
  const actor = createActor(machine, { input: { workOrder } });
  
  actor.start();
  const snapshot = actor.getSnapshot();
  
  const transitions: Array<{ event: string; targetState: WorkOrderState; requiresInput?: string }> = [];
  
  // Get all possible events from current state
  const currentState = snapshot.value as WorkOrderState;
  const stateNode = machine.states?.[currentState];
  
  if (!stateNode?.on) {
    return transitions;
  }

  // Extract transitions from state configuration
  Object.entries(stateNode.on).forEach(([eventType, config]) => {
    if (Array.isArray(config)) {
      config.forEach((t) => {
        if (typeof t === 'object' && 'target' in t && t.target) {
          transitions.push({
            event: eventType,
            targetState: t.target as WorkOrderState,
            requiresInput: getRequiredInput(eventType),
          });
        }
      });
    } else if (typeof config === 'object' && 'target' in config && config.target) {
      transitions.push({
        event: eventType,
        targetState: config.target as WorkOrderState,
        requiresInput: getRequiredInput(eventType),
      });
    }
  });

  actor.stop();
  return transitions;
}

/**
 * Check if a specific transition is valid for a work order.
 */
export function canTransition(
  workOrder: WorkOrder,
  event: InternalWorkOrderEvent | ExternalWorkOrderEvent
): boolean {
  const machine = workOrder.type === 'internal' ? internalWorkOrderMachine : externalWorkOrderMachine;
  const actor = createActor(machine, { input: { workOrder } });
  
  actor.start();
  const snapshot = actor.getSnapshot();
  
  // Check if event can be sent in current state
  // Type assertion needed because the union of events doesn't exactly match each machine's event type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canSend = snapshot.can(event as any);
  
  actor.stop();
  return canSend;
}

/**
 * Get all terminal (final) states for a work order type.
 */
export function getTerminalStates(type: WorkOrderType): WorkOrderState[] {
  return type === 'internal' 
    ? ['done', 'aborted', 'obsolete'] 
    : ['done', 'aborted', 'obsolete'];
}

/**
 * Check if a work order is in a terminal state.
 */
export function isTerminalState(workOrder: WorkOrder): boolean {
  const terminalStates = getTerminalStates(workOrder.type);
  return terminalStates.includes(workOrder.state);
}

/**
 * Get the required input field for an event type.
 */
function getRequiredInput(eventType: string): string | undefined {
  const inputMap: Record<string, string> = {
    ASSIGN: 'assignedTo',
    PLAN: 'scheduledStart',
    COMPLETE: 'actualEnd',
    REQUEST_OFFER: 'companyId',
    RECEIVE_OFFER: 'offer',
  };
  return inputMap[eventType];
}

/**
 * Get a human-readable description of why a transition is blocked.
 */
export function getTransitionBlockReason(
  workOrder: WorkOrder,
  event: InternalWorkOrderEvent | ExternalWorkOrderEvent
): string | null {
  if (event.type === 'ASSIGN' && (!('assignedTo' in event) || !event.assignedTo)) {
    return 'Assigned user is required';
  }
  
  if (event.type === 'PLAN' && (!('scheduledStart' in event) || !event.scheduledStart)) {
    return 'Scheduled start date is required';
  }
  
  if (event.type === 'COMPLETE') {
    if (!('actualEnd' in event) || !event.actualEnd) {
      return 'Actual end date is required';
    }
    
    const allCompleted = workOrder.lineItems.every(
      (item) => item.completionStatus === 'completed'
    );
    if (!allCompleted) {
      return 'All assets must be marked as completed';
    }
  }
  
  if (event.type === 'APPROVE' && !workOrder.approvalResponsibleId) {
    return 'Approval responsible person must be assigned';
  }
  
  if (event.type === 'REQUEST_OFFER' && (!('companyId' in event) || !event.companyId)) {
    return 'Company ID is required';
  }
  
  if (event.type === 'PLAN' && workOrder.type === 'external') {
    const offers = workOrder.offers || [];
    if (offers.length === 0) {
      return 'At least one offer must be received before planning';
    }
  }
  
  return null;
}

/**
 * Get the complete state transition history for a work order.
 */
export function getStateHistory(workOrder: WorkOrder): Array<{
  state: WorkOrderState;
  timestamp: string;
  changedBy?: string;
}> {
  return workOrder.history.map((entry) => ({
    state: entry.state,
    timestamp: entry.changedAt,
    changedBy: entry.changedByName || entry.changedBy,
  }));
}

/**
 * Calculate the duration a work order spent in a specific state.
 */
export function getStateDuration(
  workOrder: WorkOrder,
  state: WorkOrderState
): number | null {
  const history = workOrder.history;
  const enterIndex = history.findIndex((h) => h.state === state);
  
  if (enterIndex === -1) {
    return null; // Never entered this state
  }
  
  const enterEntry = history[enterIndex];
  if (!enterEntry) {
    return null;
  }
  
  const enterTime = new Date(enterEntry.changedAt).getTime();
  
  // Find next state change
  const exitIndex = history.findIndex((h, i) => i > enterIndex && h.state !== state);
  
  if (exitIndex === -1) {
    // Still in this state
    return Date.now() - enterTime;
  }
  
  const exitEntry = history[exitIndex];
  if (!exitEntry) {
    return Date.now() - enterTime;
  }
  
  const exitTime = new Date(exitEntry.changedAt).getTime();
  return exitTime - enterTime;
}
