/**
 * Maintenance Constants
 * 
 * Constants for maintenance scheduling and work order generation.
 */

/**
 * Maximum horizon for pre-generating work orders in months.
 * Work orders will be generated up to 5 years in advance.
 */
export const MAX_WORK_ORDER_HORIZON_MONTHS = 60;

/**
 * Maximum horizon for pre-generating work orders in days.
 * Approximately 5 years (60 months * 30 days).
 */
export const MAX_WORK_ORDER_HORIZON_DAYS = 60 * 30;
