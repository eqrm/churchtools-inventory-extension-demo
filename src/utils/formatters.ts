import { format as formatDate, formatDistanceToNow as formatDistanceToNowFn } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { AssetStatus, BookingStatus } from '../types/entities';

/**
 * Format a date string or Date object
 */
export function formatDateTime(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDate(dateObj, 'dd.MM.yyyy HH:mm');
}

/**
 * Format a date (no time)
 */
export function formatDateOnly(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDate(dateObj, 'dd.MM.yyyy');
}

/**
 * Format relative time distance (e.g., "5 minutes ago", "2 hours ago")
 */
export function formatDistanceToNow(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNowFn(dateObj, { addSuffix: true, locale: enUS });
}

/**
 * Format asset status for display
 */
export function formatAssetStatus(status: AssetStatus): string {
    const statusMap: Record<AssetStatus, string> = {
        available: 'Available',
        'in-use': 'In Use',
        broken: 'Broken',
        'in-maintenance': 'In Maintenance',
        retired: 'Retired',
        disposed: 'Disposed',
        'in-repair': 'In Repair',
        installed: 'Installed',
        sold: 'Sold',
        destroyed: 'Destroyed',
        deleted: 'Deleted',
    };
    return statusMap[status];
}

/**
 * Format booking status for display
 */
export function formatBookingStatus(status: BookingStatus): string {
    const statusMap: Record<BookingStatus, string> = {
        pending: 'Pending',
        approved: 'Approved',
        declined: 'Declined',
        active: 'Active',
        completed: 'Completed',
        overdue: 'Overdue',
        cancelled: 'Cancelled',
        'maintenance-hold': 'Maintenance Hold',
    };
    return statusMap[status];
}

/**
 * Format person name
 */
export function formatPersonName(firstName: string | null | undefined, lastName: string | null | undefined): string {
    if (!firstName && !lastName) return 'Unknown';
    if (!firstName) return lastName ?? 'Unknown';
    if (!lastName) return firstName;
    return `${firstName} ${lastName}`;
}

/**
 * Format currency (EUR)
 */
export function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount);
}

/**
 * Format file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeLabel = sizes[i] ?? 'Bytes';
    const sizeValue = Math.round((bytes / Math.pow(k, i)) * 100) / 100;
    
    return `${sizeValue.toString()} ${sizeLabel}`;
}
