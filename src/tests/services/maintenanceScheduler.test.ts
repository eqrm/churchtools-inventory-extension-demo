/**
 * Tests for maintenanceScheduler.ts
 * 
 * Issue 5: Add 'days' as interval type for maintenance rules
 * T4.4.3: Test edge cases for previewRuleSchedule
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateNextDueDate, 
  previewRuleSchedule 
} from '../../services/maintenanceScheduler';
import type { MaintenanceRule } from '../../types/maintenance';
import type { ISODate, ISOTimestamp, UUID } from '../../types/entities';

describe('calculateNextDueDate', () => {
  describe('days interval type', () => {
    it('should calculate next due date for days interval', () => {
      const anchor = new Date('2024-01-01');
      const result = calculateNextDueDate('days', 30, anchor);
      expect(result).toBe('2024-01-31');
    });

    it('should handle 1 day interval', () => {
      const anchor = new Date('2024-01-01');
      const result = calculateNextDueDate('days', 1, anchor);
      expect(result).toBe('2024-01-02');
    });

    it('should handle 7 days (weekly) interval', () => {
      const anchor = new Date('2024-01-01');
      const result = calculateNextDueDate('days', 7, anchor);
      expect(result).toBe('2024-01-08');
    });

    it('should handle 90 days (quarterly) interval', () => {
      const anchor = new Date('2024-01-01');
      const result = calculateNextDueDate('days', 90, anchor);
      expect(result).toBe('2024-03-31');
    });

    it('should handle 365 days (yearly) interval', () => {
      const anchor = new Date('2024-01-01');
      const result = calculateNextDueDate('days', 365, anchor);
      expect(result).toBe('2024-12-31');
    });

    it('should handle crossing month boundaries', () => {
      const anchor = new Date('2024-01-25');
      const result = calculateNextDueDate('days', 10, anchor);
      expect(result).toBe('2024-02-04');
    });

    it('should handle crossing year boundaries', () => {
      const anchor = new Date('2024-12-25');
      const result = calculateNextDueDate('days', 14, anchor);
      expect(result).toBe('2025-01-08');
    });
  });

  describe('months interval type', () => {
    it('should still work for months interval', () => {
      const anchor = new Date('2024-01-01');
      const result = calculateNextDueDate('months', 3, anchor);
      expect(result).toBe('2024-04-01');
    });

    it('should handle 6 month interval', () => {
      const anchor = new Date('2024-01-15');
      const result = calculateNextDueDate('months', 6, anchor);
      expect(result).toBe('2024-07-15');
    });
  });

  describe('uses interval type', () => {
    it('should return null for uses interval (not time-based)', () => {
      const anchor = new Date('2024-01-01');
      const result = calculateNextDueDate('uses', 100, anchor);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null for invalid date', () => {
      const anchor = new Date('invalid');
      const result = calculateNextDueDate('days', 30, anchor);
      expect(result).toBeNull();
    });
  });
});

describe('previewRuleSchedule with days interval', () => {
  const createMockRule = (intervalType: 'days' | 'months' | 'uses', intervalValue: number, startDate: string): MaintenanceRule => ({
    id: 'test-rule-id' as UUID,
    name: 'Test Rule',
    workType: 'inspection',
    isInternal: true,
    targets: [{ type: 'asset', ids: ['asset-1' as UUID] }],
    intervalType,
    intervalValue,
    startDate: startDate as ISODate,
    nextDueDate: startDate as ISODate,
    leadTimeDays: 7,
    createdBy: 'user-1' as UUID,
    createdAt: '2024-01-01T00:00:00Z' as ISOTimestamp,
    updatedAt: '2024-01-01T00:00:00Z' as ISOTimestamp,
  });

  it('should generate preview for days interval rule', () => {
    const rule = createMockRule('days', 14, '2024-01-01');
    const items = previewRuleSchedule(rule, { 
      occurrences: 3,
      now: new Date('2024-01-01'),
    });

    expect(items).toHaveLength(3);
    expect(items[0].dueDate).toBe('2024-01-01');
    expect(items[1].dueDate).toBe('2024-01-15');
    expect(items[2].dueDate).toBe('2024-01-29');
  });

  it('should calculate lead time start correctly for days interval', () => {
    const rule = createMockRule('days', 30, '2024-02-01');
    const items = previewRuleSchedule(rule, { 
      occurrences: 2,
      now: new Date('2024-01-01'),
    });

    expect(items).toHaveLength(2);
    expect(items[0].leadTimeStart).toBe('2024-01-25'); // 7 days before 2024-02-01
    expect(items[1].leadTimeStart).toBe('2024-02-24'); // 7 days before 2024-03-02
  });

  it('should mark past dates correctly for days interval', () => {
    const rule = createMockRule('days', 7, '2024-01-01');
    const items = previewRuleSchedule(rule, { 
      occurrences: 4,
      now: new Date('2024-01-16'),
    });

    expect(items).toHaveLength(4);
    expect(items[0].isPast).toBe(true); // 2024-01-01
    expect(items[1].isPast).toBe(true); // 2024-01-08
    expect(items[2].isPast).toBe(true); // 2024-01-15
    expect(items[3].isPast).toBe(false); // 2024-01-22
  });
});

// T4.4.3: Edge cases for previewRuleSchedule
describe('previewRuleSchedule edge cases', () => {
  const createPartialRule = (overrides: Partial<MaintenanceRule> = {}): MaintenanceRule => ({
    id: 'test-rule-id' as UUID,
    name: 'Test Rule',
    workType: 'inspection',
    isInternal: true,
    targets: [{ type: 'asset', ids: ['asset-1' as UUID] }],
    intervalType: 'months',
    intervalValue: 3,
    startDate: '2024-01-01' as ISODate,
    nextDueDate: '2024-04-01' as ISODate,
    leadTimeDays: 7,
    createdBy: 'user-1' as UUID,
    createdAt: '2024-01-01T00:00:00Z' as ISOTimestamp,
    updatedAt: '2024-01-01T00:00:00Z' as ISOTimestamp,
    ...overrides,
  });

  it('should use startDate when nextDueDate is undefined', () => {
    const rule = createPartialRule({
      startDate: '2024-03-01' as ISODate,
      nextDueDate: undefined as unknown as ISODate,
    });
    
    const items = previewRuleSchedule(rule, { 
      occurrences: 2,
      now: new Date('2024-01-01'),
    });

    expect(items).toHaveLength(2);
    expect(items[0].dueDate).toBe('2024-03-01'); // Uses startDate since nextDueDate is undefined
    expect(items[1].dueDate).toBe('2024-06-01'); // 3 months after
  });

  it('should use startDateOverride when provided', () => {
    const rule = createPartialRule({
      startDate: '2024-01-01' as ISODate,
      nextDueDate: '2024-04-01' as ISODate,
    });
    
    const items = previewRuleSchedule(rule, { 
      occurrences: 2,
      now: new Date('2024-01-01'),
      startDateOverride: new Date('2024-06-01'),
    });

    expect(items).toHaveLength(2);
    expect(items[0].dueDate).toBe('2024-06-01'); // Uses override
    expect(items[1].dueDate).toBe('2024-09-01'); // 3 months after override
  });

  it('should return empty array when both startDate and nextDueDate are invalid', () => {
    const rule = createPartialRule({
      startDate: 'invalid' as ISODate,
      nextDueDate: undefined as unknown as ISODate,
    });
    
    const items = previewRuleSchedule(rule, { 
      occurrences: 2,
      now: new Date('2024-01-01'),
    });

    expect(items).toHaveLength(0);
  });

  it('should handle uses interval type (not time-based)', () => {
    const rule = createPartialRule({
      intervalType: 'uses',
      intervalValue: 100,
      startDate: '2024-01-01' as ISODate,
      nextDueDate: '2024-01-01' as ISODate,
    });
    
    const items = previewRuleSchedule(rule, { 
      occurrences: 3,
      now: new Date('2024-01-01'),
    });

    // For uses interval, we can only show the first occurrence since
    // subsequent dates cannot be calculated without usage data
    expect(items).toHaveLength(1);
    expect(items[0].dueDate).toBe('2024-01-01');
  });

  it('should default occurrences to 3 when not specified', () => {
    const rule = createPartialRule();
    
    const items = previewRuleSchedule(rule, { 
      now: new Date('2024-01-01'),
    });

    expect(items).toHaveLength(3);
  });

  it('should handle minimum occurrences of 1', () => {
    const rule = createPartialRule();
    
    const items = previewRuleSchedule(rule, { 
      occurrences: 0, // Should be treated as 1
      now: new Date('2024-01-01'),
    });

    expect(items).toHaveLength(1);
  });
});
