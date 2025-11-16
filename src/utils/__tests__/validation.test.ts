/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  isValidAssetNumber,
  validateAssetNumber,
  isValidBarcode,
  isValidQRCode,
  isValidEmail,
  isDateInFuture,
  isValidDateRange,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validatePositiveNumber,
  validateNonNegativeNumber,
  isValidURL,
  validateURL,
  validateCustomFieldValue,
} from '../validators';

describe('validators', () => {
  describe('isValidAssetNumber', () => {
    it('should accept 1-5 digit numbers', () => {
      expect(isValidAssetNumber('1')).toBe(true);
      expect(isValidAssetNumber('12')).toBe(true);
      expect(isValidAssetNumber('123')).toBe(true);
      expect(isValidAssetNumber('1234')).toBe(true);
      expect(isValidAssetNumber('12345')).toBe(true);
    });

    it('should reject numbers with more than 5 digits', () => {
      expect(isValidAssetNumber('123456')).toBe(false);
    });

    it('should reject non-numeric input', () => {
      expect(isValidAssetNumber('abc')).toBe(false);
      expect(isValidAssetNumber('12a')).toBe(false);
      expect(isValidAssetNumber('a12')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidAssetNumber('')).toBe(false);
    });

    it('should reject numbers with spaces', () => {
      expect(isValidAssetNumber('1 2')).toBe(false);
      expect(isValidAssetNumber(' 12')).toBe(false);
    });
  });

  describe('validateAssetNumber', () => {
    it('should return null for valid asset numbers', () => {
      expect(validateAssetNumber('1')).toBe(null);
      expect(validateAssetNumber('12345')).toBe(null);
    });

    it('should return error for empty input', () => {
      expect(validateAssetNumber('')).toBe('Asset number is required');
      expect(validateAssetNumber('   ')).toBe('Asset number is required');
    });

    it('should return error for invalid format', () => {
      expect(validateAssetNumber('abc')).toBe('Asset number must contain 1-5 digits');
      expect(validateAssetNumber('123456')).toBe('Asset number must contain 1-5 digits');
    });
  });

  describe('isValidBarcode', () => {
    it('should accept printable ASCII characters', () => {
      expect(isValidBarcode('ABC123')).toBe(true);
      expect(isValidBarcode('Test-Barcode_01')).toBe(true);
      expect(isValidBarcode('!@#$%^&*()')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidBarcode('')).toBe(false);
    });

    it('should reject non-ASCII characters', () => {
      expect(isValidBarcode('Ω')).toBe(false);
      expect(isValidBarcode('中文')).toBe(false);
    });
  });

  describe('isValidQRCode', () => {
    it('should accept non-empty strings', () => {
      expect(isValidQRCode('A')).toBe(true);
      expect(isValidQRCode('ABC123')).toBe(true);
      expect(isValidQRCode('中文')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidQRCode('')).toBe(false);
    });

    it('should reject strings longer than 4296 characters', () => {
      const longString = 'A'.repeat(4297);
      expect(isValidQRCode(longString)).toBe(false);
    });

    it('should accept strings up to 4296 characters', () => {
      const maxString = 'A'.repeat(4296);
      expect(isValidQRCode(maxString)).toBe(true);
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('first+last@test.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test@example')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isDateInFuture', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      expect(isDateInFuture(futureDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      expect(isDateInFuture(pastDate)).toBe(false);
    });

    it('should return false for current time (approximately)', () => {
      const now = new Date();
      expect(isDateInFuture(now)).toBe(false);
    });
  });

  describe('isValidDateRange', () => {
    it('should return true when start is before end', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-02');
      expect(isValidDateRange(start, end)).toBe(true);
    });

    it('should return false when start is after end', () => {
      const start = new Date('2025-01-02');
      const end = new Date('2025-01-01');
      expect(isValidDateRange(start, end)).toBe(false);
    });

    it('should return false when start equals end', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-01');
      expect(isValidDateRange(start, end)).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should return null for non-empty values', () => {
      expect(validateRequired('value', 'Field')).toBe(null);
    });

    it('should return error for empty string', () => {
      expect(validateRequired('', 'Field')).toBe('Field is required');
      expect(validateRequired('   ', 'Field')).toBe('Field is required');
    });

    it('should return error for null/undefined', () => {
      expect(validateRequired(null, 'Field')).toBe('Field is required');
      expect(validateRequired(undefined, 'Field')).toBe('Field is required');
    });
  });

  describe('validateMinLength', () => {
    it('should return null when length is sufficient', () => {
      expect(validateMinLength('abcd', 3, 'Field')).toBe(null);
      expect(validateMinLength('abc', 3, 'Field')).toBe(null);
    });

    it('should return error when length is insufficient', () => {
      const error = validateMinLength('ab', 3, 'Field');
      expect(error).toBe('Field must be at least 3 characters long');
    });
  });

  describe('validateMaxLength', () => {
    it('should return null when length is within limit', () => {
      expect(validateMaxLength('ab', 3, 'Field')).toBe(null);
      expect(validateMaxLength('abc', 3, 'Field')).toBe(null);
    });

    it('should return error when length exceeds limit', () => {
      const error = validateMaxLength('abcd', 3, 'Field');
      expect(error).toBe('Field must be at most 3 characters long');
    });
  });

  describe('validatePositiveNumber', () => {
    it('should return null for positive numbers', () => {
      expect(validatePositiveNumber(1, 'Field')).toBe(null);
      expect(validatePositiveNumber(0.1, 'Field')).toBe(null);
      expect(validatePositiveNumber(100, 'Field')).toBe(null);
    });

    it('should return error for zero', () => {
      const error = validatePositiveNumber(0, 'Field');
      expect(error).toBe('Field must be a positive number');
    });

    it('should return error for negative numbers', () => {
      const error = validatePositiveNumber(-1, 'Field');
      expect(error).toBe('Field must be a positive number');
    });
  });

  describe('validateNonNegativeNumber', () => {
    it('should return null for positive numbers and zero', () => {
      expect(validateNonNegativeNumber(0, 'Field')).toBe(null);
      expect(validateNonNegativeNumber(1, 'Field')).toBe(null);
      expect(validateNonNegativeNumber(100, 'Field')).toBe(null);
    });

    it('should return error for negative numbers', () => {
      const error = validateNonNegativeNumber(-1, 'Field');
      expect(error).toBe('Field cannot be negative');
    });
  });

  describe('isValidURL', () => {
    it('should accept valid HTTP and HTTPS URLs', () => {
      expect(isValidURL('http://example.com')).toBe(true);
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('https://www.example.com/path?query=value')).toBe(true);
    });

    it('should reject non-HTTP/HTTPS protocols', () => {
      expect(isValidURL('ftp://example.com')).toBe(false);
      expect(isValidURL('file:///path/to/file')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(isValidURL('not a url')).toBe(false);
      expect(isValidURL('example.com')).toBe(false);
      expect(isValidURL('')).toBe(false);
    });
  });

  describe('validateURL', () => {
    it('should return null for valid URLs', () => {
      expect(validateURL('https://example.com')).toBe(null);
    });

    it('should return null for empty string (optional field)', () => {
      expect(validateURL('')).toBe(null);
      expect(validateURL('   ')).toBe(null);
    });

    it('should return error for invalid URLs', () => {
      const error = validateURL('not a url');
      expect(error).toBe('Please enter a valid URL (e.g., https://example.com)');
    });
  });

  describe('validateCustomFieldValue', () => {
    describe('required fields', () => {
      it('should return error for empty required text field', () => {
        const field = { type: 'text', required: true };
        const error = validateCustomFieldValue('', field, 'Field');
        expect(error).toBe('Field is required');
      });

      it('should return null for filled required text field', () => {
        const field = { type: 'text', required: true };
        const error = validateCustomFieldValue('value', field, 'Field');
        expect(error).toBe(null);
      });

      it('should return null for empty optional field', () => {
        const field = { type: 'text', required: false };
        const error = validateCustomFieldValue('', field, 'Field');
        expect(error).toBe(null);
      });
    });

    describe('text fields', () => {
      it('should validate minLength', () => {
        const field = { type: 'text', required: false, validation: { minLength: 3 } };
        expect(validateCustomFieldValue('ab', field, 'Field')).toContain('at least 3');
        expect(validateCustomFieldValue('abc', field, 'Field')).toBe(null);
      });

      it('should validate maxLength', () => {
        const field = { type: 'text', required: false, validation: { maxLength: 3 } };
        expect(validateCustomFieldValue('abcd', field, 'Field')).toContain('at most 3');
        expect(validateCustomFieldValue('abc', field, 'Field')).toBe(null);
      });

      it('should validate pattern', () => {
        const field = { type: 'text', required: false, validation: { pattern: '^[A-Z]+$' } };
        expect(validateCustomFieldValue('abc', field, 'Field')).toContain('required format');
        expect(validateCustomFieldValue('ABC', field, 'Field')).toBe(null);
      });
    });

    describe('number fields', () => {
      it('should validate min value', () => {
        const field = { type: 'number', required: false, validation: { min: 0 } };
        expect(validateCustomFieldValue(-1, field, 'Field')).toContain('at least 0');
        expect(validateCustomFieldValue(0, field, 'Field')).toBe(null);
        expect(validateCustomFieldValue(5, field, 'Field')).toBe(null);
      });

      it('should validate max value', () => {
        const field = { type: 'number', required: false, validation: { max: 10 } };
        expect(validateCustomFieldValue(11, field, 'Field')).toContain('at most 10');
        expect(validateCustomFieldValue(10, field, 'Field')).toBe(null);
        expect(validateCustomFieldValue(5, field, 'Field')).toBe(null);
      });
    });

    describe('select fields', () => {
      it('should validate against options', () => {
        const field = { type: 'select', required: false, options: ['A', 'B', 'C'] };
        expect(validateCustomFieldValue('D', field, 'Field')).toContain('available options');
        expect(validateCustomFieldValue('A', field, 'Field')).toBe(null);
      });
    });

    describe('multi-select fields', () => {
      it('should validate array values against options', () => {
        const field = { type: 'multi-select', required: false, options: ['A', 'B', 'C'] };
        expect(validateCustomFieldValue(['A', 'D'], field, 'Field')).toContain('invalid options');
        expect(validateCustomFieldValue(['A', 'B'], field, 'Field')).toBe(null);
      });
    });

    describe('date fields', () => {
      it('should validate date format', () => {
        const field = { type: 'date', required: false };
        expect(validateCustomFieldValue('invalid', field, 'Field')).toContain('valid date');
        expect(validateCustomFieldValue('2025-01-01', field, 'Field')).toBe(null);
      });
    });

    describe('checkbox fields', () => {
      it('should validate boolean type', () => {
        const field = { type: 'checkbox', required: false };
        expect(validateCustomFieldValue('not boolean', field, 'Field')).toContain('true or false');
        expect(validateCustomFieldValue(true, field, 'Field')).toBe(null);
        expect(validateCustomFieldValue(false, field, 'Field')).toBe(null);
      });
    });

    describe('URL fields', () => {
      it('should validate URL format', () => {
        const field = { type: 'url', required: false };
        expect(validateCustomFieldValue('not a url', field, 'Field')).toContain('valid URL');
        expect(validateCustomFieldValue('https://example.com', field, 'Field')).toBe(null);
      });
    });
  });
});
