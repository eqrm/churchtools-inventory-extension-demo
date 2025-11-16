import { getNextSnapshot } from 'xstate';
import type { InternalWorkOrderState, ExternalWorkOrderState } from '../../types/maintenance';
import {
  internalWorkOrderMachine,
  type InternalWorkOrderContext,
  type InternalWorkOrderEvent,
} from './InternalWorkOrderMachine';
import {
  externalWorkOrderMachine,
  type ExternalWorkOrderContext,
  type ExternalWorkOrderEvent,
} from './ExternalWorkOrderMachine';

/**
 * State Machine Adapter for Work Orders
 * 
 * This adapter provides a simple transition() interface that matches
 * the test expectations, wrapping XState v5's actor-based API.
 */

export interface StateMachine<TState extends string, TContext, TEvent> {
  transition: (state: TState, event: TEvent, context: TContext) => {
    changed: boolean;
    value: TState;
    context: TContext;
  };
}

/**
 * Create internal work order state machine adapter
 * 
 * Note: This adapter creates a simple test interface. For actual use,
 * you should use XState actors directly with proper snapshot persistence.
 */
export function createInternalMachine(): StateMachine<
  InternalWorkOrderState,
  InternalWorkOrderContext,
  InternalWorkOrderEvent
> {
  return {
    transition: (currentState, event, context) => {
      const snapshot = internalWorkOrderMachine.resolveState({ value: currentState, context });
      const nextSnapshot = getNextSnapshot(internalWorkOrderMachine, snapshot, event);

      return {
        changed: snapshot.value !== nextSnapshot.value,
        value: nextSnapshot.value as InternalWorkOrderState,
        context: nextSnapshot.context,
      };
    },
  };
}

/**
 * Create external work order state machine adapter
 */
export function createExternalMachine(): StateMachine<
  ExternalWorkOrderState,
  ExternalWorkOrderContext,
  ExternalWorkOrderEvent
> {
  return {
    transition: (currentState, event, context) => {
      const snapshot = externalWorkOrderMachine.resolveState({ value: currentState, context });
      const nextSnapshot = getNextSnapshot(externalWorkOrderMachine, snapshot, event);

      return {
        changed: snapshot.value !== nextSnapshot.value,
        value: nextSnapshot.value as ExternalWorkOrderState,
        context: nextSnapshot.context,
      };
    },
  };
}
