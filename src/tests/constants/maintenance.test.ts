import { describe, it, expect } from 'vitest';
import {
  MAX_WORK_ORDER_HORIZON_MONTHS,
  MAX_WORK_ORDER_HORIZON_DAYS,
} from '../../constants/maintenance';

describe('Maintenance Constants', () => {
  describe('T6.1.1: Generation horizon constants', () => {
    it('should define MAX_WORK_ORDER_HORIZON_MONTHS as 60 (5 years)', () => {
      expect(MAX_WORK_ORDER_HORIZON_MONTHS).toBe(60);
    });

    it('should define MAX_WORK_ORDER_HORIZON_DAYS as approximately 1800', () => {
      expect(MAX_WORK_ORDER_HORIZON_DAYS).toBe(60 * 30);
    });

    it('should have consistent horizon values', () => {
      // Days should be approximately months * 30
      expect(MAX_WORK_ORDER_HORIZON_DAYS).toBe(MAX_WORK_ORDER_HORIZON_MONTHS * 30);
    });
  });
});
