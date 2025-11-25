/**
 * Maintenance Scheduling Utilities (T169, T170, T176-T180)
 * 
 * Provides calculation logic for maintenance due dates and overdue detection
 * Supports time-based, usage-based, event-based, and fixed-date schedules
 */

import {
    addDays,
    addMonths,
    addYears,
    isBefore,
    isAfter,
    parseISO,
    startOfDay,
} from 'date-fns';
import type {
    MaintenanceSchedule,
    ISODate,
    ISOTimestamp,
} from '../types/entities';

/**
 * Calculate next due date for a maintenance schedule (T169)
 * 
 * @param schedule - Maintenance schedule
 * @param lastPerformed - Date of last maintenance (ISO format)
 * @returns Next due date (ISO format) or null if schedule incomplete
 */
export function calculateNextDue(
    schedule: MaintenanceSchedule,
    lastPerformed?: ISOTimestamp
): ISODate | null {
    const baseDate = lastPerformed ? parseISO(lastPerformed) : new Date();

    switch (schedule.scheduleType) {
        case 'time-based':
            return calculateTimeBased(baseDate, schedule);
        
        case 'usage-based':
            // Usage-based requires tracking usage hours (T177)
            // For now, return null - full implementation requires usage tracking
            return null;
        
        case 'event-based':
            // Event-based requires counting bookings (T178)
            // For now, return null - full implementation requires booking count
            return null;
        
        case 'fixed-date':
            return calculateFixedDate(schedule);
        
        default:
            return null;
    }
}

/**
 * Calculate next due date for time-based schedule (T176)
 * Supports days, months, or years intervals
 */
function calculateTimeBased(
    baseDate: Date,
    schedule: MaintenanceSchedule
): ISODate | null {
    let nextDate = baseDate;

    if (schedule.intervalDays) {
        nextDate = addDays(nextDate, schedule.intervalDays);
    } else if (schedule.intervalMonths) {
        nextDate = addMonths(nextDate, schedule.intervalMonths);
    } else if (schedule.intervalYears) {
        nextDate = addYears(nextDate, schedule.intervalYears);
    } else {
        return null; // No interval configured
    }

    return nextDate.toISOString().split('T')[0] as ISODate;
}

/**
 * Calculate next due date for fixed-date schedule (T179)
 * Returns the fixed date if in future, otherwise next year's date
 */
function calculateFixedDate(schedule: MaintenanceSchedule): ISODate | null {
    if (!schedule.fixedDate) {
        return null;
    }

    const fixedDate = parseISO(schedule.fixedDate);
    const today = startOfDay(new Date());

    // If fixed date is in the future, return it
    if (isAfter(fixedDate, today)) {
        return schedule.fixedDate;
    }

    // Otherwise, add one year
    const nextYear = addYears(fixedDate, 1);
    return nextYear.toISOString().split('T')[0] as ISODate;
}

/**
 * Check if maintenance is overdue (T170)
 * 
 * @param schedule - Maintenance schedule
 * @returns True if overdue, false otherwise
 */
export function isOverdue(schedule: MaintenanceSchedule): boolean {
    if (!schedule.nextDue) {
        return false;
    }

    const dueDate = parseISO(schedule.nextDue);
    const today = startOfDay(new Date());

    return isBefore(dueDate, today);
}

/**
 * Check if maintenance reminder should be sent (T180)
 * 
 * @param schedule - Maintenance schedule
 * @returns True if reminder due, false otherwise
 */
export function isReminderDue(schedule: MaintenanceSchedule): boolean {
    if (!schedule.nextDue) {
        return false;
    }

    const dueDate = parseISO(schedule.nextDue);
    const reminderDate = addDays(dueDate, -schedule.reminderDaysBefore);
    const today = startOfDay(new Date());

    // Reminder is due if today is on or after reminder date
    return !isBefore(today, reminderDate);
}

/**
 * Calculate days until maintenance is due
 * 
 * @param schedule - Maintenance schedule
 * @returns Number of days until due (negative if overdue)
 */
export function daysUntilDue(schedule: MaintenanceSchedule): number | null {
    if (!schedule.nextDue) {
        return null;
    }

    const dueDate = parseISO(schedule.nextDue);
    const today = startOfDay(new Date());

    const diffMs = dueDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * Calculate usage-based maintenance due (T177)
 * Requires tracking asset usage hours
 * 
 * @param schedule - Maintenance schedule
 * @param currentUsageHours - Current total usage hours
 * @param lastMaintenanceHours - Usage hours at last maintenance
 * @returns True if maintenance due based on usage
 */
export function isUsageMaintenanceDue(
    schedule: MaintenanceSchedule,
    currentUsageHours: number,
    lastMaintenanceHours: number
): boolean {
    if (schedule.scheduleType !== 'usage-based' || !schedule.intervalHours) {
        return false;
    }

    const hoursSinceLastMaintenance = currentUsageHours - lastMaintenanceHours;
    return hoursSinceLastMaintenance >= schedule.intervalHours;
}

/**
 * Calculate event-based maintenance due (T178)
 * Requires counting bookings since last maintenance
 * 
 * @param schedule - Maintenance schedule
 * @param bookingsSinceLastMaintenance - Number of bookings since last maintenance
 * @returns True if maintenance due based on events
 */
export function isEventMaintenanceDue(
    schedule: MaintenanceSchedule,
    bookingsSinceLastMaintenance: number
): boolean {
    if (schedule.scheduleType !== 'event-based' || !schedule.intervalBookings) {
        return false;
    }

    return bookingsSinceLastMaintenance >= schedule.intervalBookings;
}

/**
 * Format maintenance schedule description for UI
 * 
 * @param schedule - Maintenance schedule
 * @returns Human-readable schedule description
 */
export function formatScheduleDescription(schedule: MaintenanceSchedule): string {
    switch (schedule.scheduleType) {
        case 'time-based':
            if (schedule.intervalDays) {
                return `Every ${schedule.intervalDays} day${schedule.intervalDays > 1 ? 's' : ''}`;
            }
            if (schedule.intervalMonths) {
                return `Every ${schedule.intervalMonths} month${schedule.intervalMonths > 1 ? 's' : ''}`;
            }
            if (schedule.intervalYears) {
                return `Every ${schedule.intervalYears} year${schedule.intervalYears > 1 ? 's' : ''}`;
            }
            return 'Time-based';
        
        case 'usage-based':
            return schedule.intervalHours
                ? `Every ${schedule.intervalHours} operating hour${schedule.intervalHours > 1 ? 's' : ''}`
                : 'Usage-based';
        
        case 'event-based':
            return schedule.intervalBookings
                ? `Every ${schedule.intervalBookings} booking${schedule.intervalBookings > 1 ? 's' : ''}`
                : 'Event-based';
        
        case 'fixed-date':
            return schedule.fixedDate
                ? `Annually on ${schedule.fixedDate}`
                : 'Fixed date';
        
        default:
            return 'Unknown';
    }
}
