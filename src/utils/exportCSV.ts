/**
 * CSV Export Utility (T208)
 * 
 * Provides functions to export report data to CSV format.
 */

import type {
  AssetUtilizationData,
  MaintenanceComplianceData,
  StockTakeSummaryData,
  BookingHistoryData,
} from './reportCalculations';

/**
 * Convert data to CSV format
 */
function convertToCSV(data: unknown[], headers: string[]): string {
  const rows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = (row as Record<string, unknown>)[header];
      const stringValue = String(value ?? '');
      // Escape quotes and wrap in quotes if contains comma
      return stringValue.includes(',') || stringValue.includes('"')
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue;
    });
    rows.push(values.join(','));
  }

  return rows.join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export asset utilization report to CSV
 */
export function exportUtilizationToCSV(data: AssetUtilizationData[]): void {
  const headers = [
    'assetNumber',
    'assetName',
    'categoryName',
    'bookingCount',
    'totalDaysBooked',
    'utilizationPercentage',
    'lastBookedDate',
  ];

  const csv = convertToCSV(data, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `asset-utilization-${timestamp}.csv`);
}

/**
 * Export maintenance compliance report to CSV
 */
export function exportMaintenanceComplianceToCSV(data: MaintenanceComplianceData): void {
  const headers = [
    'assetNumber',
    'assetName',
    'scheduleName',
    'dueDate',
    'daysOverdue',
  ];

  const csv = convertToCSV(data.overdueList, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `maintenance-compliance-${timestamp}.csv`);
}

/**
 * Export stock take summary report to CSV
 */
export function exportStockTakeSummaryToCSV(data: StockTakeSummaryData): void {
  const headers = [
    'assetNumber',
    'assetName',
    'categoryName',
    'lastLocation',
  ];

  const csv = convertToCSV(data.missingAssets, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `stock-take-summary-${timestamp}.csv`);
}

/**
 * Export booking history report to CSV
 */
export function exportBookingHistoryToCSV(data: BookingHistoryData): void {
  // Export most booked assets
  const assetsHeaders = ['assetNumber', 'assetName', 'bookingCount'];
  const assetsCSV = convertToCSV(data.mostBookedAssets, assetsHeaders);

  // Export bookings by month
  const monthsHeaders = ['month', 'count'];
  const monthsCSV = convertToCSV(data.bookingsByMonth, monthsHeaders);

  // Combine both sections
  const combinedCSV = `Most Booked Assets\n${assetsCSV}\n\nBookings by Month\n${monthsCSV}`;

  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(combinedCSV, `booking-history-${timestamp}.csv`);
}

/**
 * Work order completion row data for CSV export
 */
export interface WorkOrderCompletionRow {
  id: string;
  workOrderNumber: string;
  assetName: string;
  type: string;
  orderType: string;
  scheduledEnd: string;
  actualEnd: string;
  daysEarlyLate: number;
}

/**
 * Export work order completion report to CSV
 */
export function exportWorkOrderCompletionToCSV(data: WorkOrderCompletionRow[]): void {
  const headers = [
    'workOrderNumber',
    'assetName',
    'type',
    'orderType',
    'scheduledEnd',
    'actualEnd',
    'daysEarlyLate',
  ];

  const csv = convertToCSV(data, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `work-order-completion-${timestamp}.csv`);
}
