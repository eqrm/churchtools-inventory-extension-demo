import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { evaluateCondition } from '../../utils/filterEvaluation';
import type { RelativeDateFilterValue } from '../../types/entities';

describe('filterEvaluation relative operators', () => {
  const relativeValue: RelativeDateFilterValue = {
    direction: 'last',
    unit: 'days',
    amount: 7,
  };
  const defaultNow = new Date('2025-01-10T00:00:00.000Z');

  beforeAll(() => {
    vi.useFakeTimers();
  });

  beforeEach(() => {
    vi.setSystemTime(defaultNow);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns true for dates within the last N days', () => {
    const matches = evaluateCondition('2025-01-05T12:00:00.000Z', 'relative-last', relativeValue);
    expect(matches).toBe(true);
  });

  it('returns false for dates outside the configured window', () => {
    const matches = evaluateCondition('2024-12-20T00:00:00.000Z', 'relative-last', relativeValue);
    expect(matches).toBe(false);
  });

  it('matches dates occurring in the upcoming window', () => {
    const upcomingValue: RelativeDateFilterValue = {
      direction: 'next',
      unit: 'weeks',
      amount: 2,
    };
    const matches = evaluateCondition('2025-01-20T00:00:00.000Z', 'relative-next', upcomingValue);
    expect(matches).toBe(true);
  });

  it('includes the start boundary when evaluating relative-last filters', () => {
    const matches = evaluateCondition('2025-01-03T00:00:00.000Z', 'relative-last', relativeValue);
    expect(matches).toBe(true);
  });

  it('includes the end boundary when evaluating relative-next filters', () => {
    const upcomingValue: RelativeDateFilterValue = {
      direction: 'next',
      unit: 'weeks',
      amount: 2,
    };
    const matches = evaluateCondition('2025-01-24T00:00:00.000Z', 'relative-next', upcomingValue);
    expect(matches).toBe(true);
  });

  it('normalizes direction and amount based on the operator when filters are malformed', () => {
    const malformedValue = {
      direction: 'last',
      unit: 'weeks',
      amount: 0,
    } as RelativeDateFilterValue;
    const matches = evaluateCondition('2025-01-17T00:00:00.000Z', 'relative-next', malformedValue);
    expect(matches).toBe(true);
  });

  it('handles month offsets that land on shorter months', () => {
    const marchNow = new Date('2025-03-31T00:00:00.000Z');
    vi.setSystemTime(marchNow);

    const monthValue: RelativeDateFilterValue = {
      direction: 'last',
      unit: 'months',
      amount: 1,
    };

    const matchesAtClampedDay = evaluateCondition('2025-02-28T00:00:00.000Z', 'relative-last', monthValue);
    const outsideWindow = evaluateCondition('2025-02-27T23:59:59.000Z', 'relative-last', monthValue);

    expect(matchesAtClampedDay).toBe(true);
    expect(outsideWindow).toBe(false);

    vi.setSystemTime(defaultNow);
  });
});
