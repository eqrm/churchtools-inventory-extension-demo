/**
 * Date Validation Utilities
 * 
 * As defined in DATE_VALIDATION.md:
 * - Past dates: 0-730 days (2 years)
 * - Future dates: 1-365 days (1 year)
 * - Timezone handling: store UTC, display local
 * - Month-end edge cases handled
 */

import type { ISODate, ISOTimestamp } from '../types/entities';

/**
 * Validation constraints
 */
export const DATE_CONSTRAINTS = {
  MAX_PAST_DAYS: 730,    // 2 years
  MIN_PAST_DAYS: 0,      // today
  MAX_FUTURE_DAYS: 365,  // 1 year
  MIN_FUTURE_DAYS: 1,    // tomorrow
} as const;

/**
 * Validate a past date is within acceptable range (0-730 days ago)
 */
export function validatePastDate(date: Date | string): { valid: boolean; error?: string } {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < DATE_CONSTRAINTS.MIN_PAST_DAYS) {
    return { valid: false, error: 'Date cannot be in the future' };
  }

  if (daysDiff > DATE_CONSTRAINTS.MAX_PAST_DAYS) {
    return {
      valid: false,
      error: `Date cannot be more than ${DATE_CONSTRAINTS.MAX_PAST_DAYS} days in the past`,
    };
  }

  return { valid: true };
}

/**
 * Validate a future date is within acceptable range (1-365 days from now)
 */
export function validateFutureDate(date: Date | string): { valid: boolean; error?: string } {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < DATE_CONSTRAINTS.MIN_FUTURE_DAYS) {
    return { valid: false, error: 'Date must be in the future' };
  }

  if (daysDiff > DATE_CONSTRAINTS.MAX_FUTURE_DAYS) {
    return {
      valid: false,
      error: `Date cannot be more than ${DATE_CONSTRAINTS.MAX_FUTURE_DAYS} days in the future`,
    };
  }

  return { valid: true };
}

/**
 * Validate a date range
 */
export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string,
): { valid: boolean; error?: string } {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (start >= end) {
    return { valid: false, error: 'Start date must be before end date' };
  }

  return { valid: true };
}

/**
 * Convert local date to UTC ISO string
 */
export function toUTCISOString(date: Date): ISOTimestamp {
  return date.toISOString();
}

/**
 * Convert UTC ISO string to local Date
 */
export function fromUTCISOString(isoString: ISOTimestamp): Date {
  return new Date(isoString);
}

/**
 * Get date in ISO format (YYYY-MM-DD) in local timezone
 */
export function toISODate(date: Date): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse ISO date string to Date object in local timezone
 */
export function fromISODate(isoDate: ISODate): Date {
  const parts = isoDate.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  
  if (!year || !month || !day) {
    throw new Error(`Invalid ISO date format: ${isoDate}`);
  }
  
  return new Date(year, month - 1, day);
}

/**
 * Add months to a date, handling month-end edge cases
 * Example: Jan 31 + 1 month = Feb 28/29 (last day of month)
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const currentDay = result.getDate();
  
  result.setMonth(result.getMonth() + months);
  
  // Handle month-end edge case: if day changed due to shorter month, set to last day
  if (result.getDate() !== currentDay) {
    result.setDate(0); // Set to last day of previous month
  }
  
  return result;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get relative date (e.g., "last 7 days", "next 30 days")
 */
export function getRelativeDate(relativeDays: number, fromDate?: Date): Date {
  const base = fromDate || new Date();
  return addDays(base, relativeDays);
}

/**
 * Get start of day (00:00:00)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day (23:59:59)
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return toISODate(date1) === toISODate(date2);
}

/**
 * Get number of days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const start = startOfDay(date1);
  const end = startOfDay(date2);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if date is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get last day of month
 */
export function getLastDayOfMonth(year: number, month: number): number {
  const monthLengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const lastDay = monthLengths[month];
  
  if (!lastDay) {
    throw new Error(`Invalid month: ${month}. Month must be 0-11.`);
  }
  
  return lastDay;
}

/**
 * Format date for display in user's local timezone
 */
export function formatLocalDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}

/**
 * Format datetime for display in user's local timezone
 */
export function formatLocalDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

/**
 * Get user's timezone offset in minutes
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/**
 * Get user's timezone name
 */
export function getTimezoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
