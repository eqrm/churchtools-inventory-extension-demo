import { createMachine } from 'xstate';
import type { EventObject, StateValue } from 'xstate';

export { createMachine };

export interface TransitionCheckResult<TContext, TEvent extends EventObject> {
  changed: boolean;
  value: StateValue;
  event: TEvent;
  context: TContext;
}

interface TransitionCapable<TContext, TEvent extends EventObject> {
  transition: (
    state: StateValue,
    event: TEvent,
  ) => {
    changed?: boolean;
    value: StateValue;
    context: TContext;
  };
}

export const evaluateTransition = <TContext, TEvent extends EventObject>(
  machine: TransitionCapable<TContext, TEvent>,
  stateValue: StateValue,
  event: TEvent,
): TransitionCheckResult<TContext, TEvent> => {
  const result = machine.transition(stateValue, event);

  return {
    changed: Boolean(result.changed),
    value: result.value,
    event,
    context: result.context,
  };
};

export const canTransition = <TContext, TEvent extends EventObject>(
  machine: TransitionCapable<TContext, TEvent>,
  stateValue: StateValue,
  event: TEvent,
): boolean => evaluateTransition(machine, stateValue, event).changed;

export const assertCanTransition = <TContext, TEvent extends EventObject>(
  machine: TransitionCapable<TContext, TEvent>,
  stateValue: StateValue,
  event: TEvent,
): void => {
  if (!canTransition(machine, stateValue, event)) {
    throw new Error(`Invalid transition for event "${String(event.type)}" from state "${String(stateValue)}".`);
  }
};
