/**
 * Report data calculation utilities (T207)
 * 
 * Provides calculation functions for generating report data
 * from assets, bookings, maintenance records, and stock take sessions.
 */

import type {
  Asset,
  AssetGroup,
  Booking,
  MaintenanceSchedule,
  StockTakeSession,
  ISOTimestamp,
} from '../types/entities';
import { differenceInDays, parseISO } from 'date-fns';

// ============================================================================
// Asset Utilization Calculations
// ============================================================================

export interface AssetUtilizationData {
  assetId: string;
  assetNumber: string;
  assetName: string;
  assetTypeName: string;
  bookingCount: number;
  totalDaysBooked: number;
  utilizationPercentage: number;
  lastBookedDate?: ISOTimestamp;
}

export interface AssetGroupUtilizationData {
  groupId: string;
  groupNumber: string;
  groupName: string;
  memberCount: number;
  bookingCount: number;
  totalDaysBooked: number;
  averageUtilization: number;
  lastBookedDate?: ISOTimestamp;
}

/**
 * Calculate asset utilization from bookings
 */
export function calculateAssetUtilization(
  assets: Asset[],
  bookings: Booking[],
  startDate: Date,
  endDate: Date
): AssetUtilizationData[] {
  const periodDays = differenceInDays(endDate, startDate) + 1;

  return assets.map((asset) => {
    const assetBookings = bookings.filter(
      (b) => b.asset?.id === asset.id && b.status !== 'cancelled'
    );

    const totalDaysBooked = assetBookings.reduce((total, booking) => {
      const bookingStart = parseISO(booking.startDate);
      const bookingEnd = parseISO(booking.endDate);
      const days = differenceInDays(bookingEnd, bookingStart) + 1;
      return total + days;
    }, 0);

    const utilizationPercentage = periodDays > 0 ? (totalDaysBooked / periodDays) * 100 : 0;

    const lastBooking = assetBookings
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

    return {
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      assetName: asset.name,
  assetTypeName: asset.assetType?.name || 'Unknown',
      bookingCount: assetBookings.length,
      totalDaysBooked,
      utilizationPercentage: Math.round(utilizationPercentage * 10) / 10,
      lastBookedDate: lastBooking?.startDate,
    };
  });
}

export function aggregateGroupUtilization(
  assets: Asset[],
  utilizationData: AssetUtilizationData[],
  assetGroups: AssetGroup[],
  startDate: Date,
  endDate: Date
): AssetGroupUtilizationData[] {
  const periodDays = Math.max(1, differenceInDays(endDate, startDate) + 1);
  const dataByAssetId = new Map(utilizationData.map((entry) => [entry.assetId, entry]));
  const groupMetaMap = new Map(assetGroups.map((group) => [group.id, group]));
  const groupedMembers = new Map<string, { assets: Asset[]; meta: AssetGroup | null }>();

  for (const asset of assets) {
    const group = asset.assetGroup;
    if (!group?.id) {
      continue;
    }

    if (!groupedMembers.has(group.id)) {
      const meta = groupMetaMap.get(group.id) ?? null;
      groupedMembers.set(group.id, { assets: [], meta });
    }

    groupedMembers.get(group.id)?.assets.push(asset);
  }

  const groupUtilization: AssetGroupUtilizationData[] = [];

  groupedMembers.forEach(({ assets: memberAssets, meta }, groupId) => {
    if (memberAssets.length === 0) {
      return;
    }

    let bookingCount = 0;
    let totalDaysBooked = 0;
    let latestBooking: ISOTimestamp | undefined;

    for (const asset of memberAssets) {
      const utilization = dataByAssetId.get(asset.id);
      if (!utilization) {
        continue;
      }

      bookingCount += utilization.bookingCount;
      totalDaysBooked += utilization.totalDaysBooked;

      if (utilization.lastBookedDate) {
        if (!latestBooking || utilization.lastBookedDate > latestBooking) {
          latestBooking = utilization.lastBookedDate;
        }
      }
    }

    if (bookingCount === 0 && totalDaysBooked === 0 && !latestBooking) {
      // Still emit a row so empty groups appear with zero activity
      latestBooking = undefined;
    }

    const groupReference = memberAssets[0]?.assetGroup;
    const groupNumber = meta?.groupNumber ?? groupReference?.groupNumber ?? 'Group';
    const groupName = meta?.name ?? groupReference?.name ?? 'Asset Group';
    const memberCount = meta?.memberCount ?? memberAssets.length;
    const averageUtilization = memberCount > 0
      ? Math.round(((totalDaysBooked / (periodDays * memberCount)) * 100) * 10) / 10
      : 0;

    groupUtilization.push({
      groupId,
      groupNumber,
      groupName,
      memberCount,
      bookingCount,
      totalDaysBooked,
      averageUtilization,
      lastBookedDate: latestBooking,
    });
  });

  return groupUtilization.sort((a, b) => b.averageUtilization - a.averageUtilization);
}

// ============================================================================
// Maintenance Compliance Calculations
// ============================================================================

export interface MaintenanceComplianceData {
  totalAssets: number;
  assetsWithSchedules: number;
  compliantAssets: number;
  overdueAssets: number;
  upcomingAssets: number;
  compliancePercentage: number;
  overdueList: Array<{
    assetId: string;
    assetNumber: string;
    assetName: string;
    scheduleName: string;
    dueDate: ISOTimestamp;
    daysOverdue: number;
  }>;
}

/**
 * Calculate maintenance compliance status
 */
export function calculateMaintenanceCompliance(
  assets: Asset[],
  schedules: MaintenanceSchedule[]
): MaintenanceComplianceData {
  const today = new Date();
  const overdueList: MaintenanceComplianceData['overdueList'] = [];
  let compliantCount = 0;
  let overdueCount = 0;
  let upcomingCount = 0;

  const assetsWithSchedules = new Set(schedules.map((s) => s.assetId));

  for (const schedule of schedules) {
    const asset = assets.find((a) => a.id === schedule.assetId);
    if (!asset) continue;

    const dueDate = schedule.nextDue ? parseISO(schedule.nextDue) : null;
    if (!dueDate) continue;

    const daysUntilDue = differenceInDays(dueDate, today);

    if (daysUntilDue < 0) {
      // Overdue
      overdueCount++;
      const scheduleNextDue = schedule.nextDue || new Date().toISOString();
      overdueList.push({
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        assetName: asset.name,
        scheduleName: `${schedule.scheduleType} maintenance`,
        dueDate: scheduleNextDue,
        daysOverdue: Math.abs(daysUntilDue),
      });
    } else if (daysUntilDue <= 30) {
      // Upcoming (within 30 days)
      upcomingCount++;
    } else {
      // Compliant
      compliantCount++;
    }
  }

  const totalWithSchedules = assetsWithSchedules.size;
  const compliancePercentage =
    totalWithSchedules > 0 ? (compliantCount / totalWithSchedules) * 100 : 0;

  return {
    totalAssets: assets.length,
    assetsWithSchedules: totalWithSchedules,
    compliantAssets: compliantCount,
    overdueAssets: overdueCount,
    upcomingAssets: upcomingCount,
    compliancePercentage: Math.round(compliancePercentage * 10) / 10,
    overdueList: overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue),
  };
}

// ============================================================================
// Stock Take Summary Calculations
// ============================================================================

export interface StockTakeSummaryData {
  sessionId: string;
  sessionName: string;
  startedAt: ISOTimestamp;
  completedAt?: ISOTimestamp;
  expectedCount: number;
  scannedCount: number;
  missingCount: number;
  unexpectedCount: number;
  completionRate: number;
  missingAssets: Array<{
    assetId: string;
    assetNumber: string;
    assetName: string;
    assetTypeName: string;
    lastLocation?: string;
  }>;
}

/**
 * Calculate stock take summary from session data
 */
export function calculateStockTakeSummary(
  session: StockTakeSession,
  assets: Asset[]
): StockTakeSummaryData {
  const expectedAssetIds = new Set(session.expectedAssets.map((a) => a.assetId));
  const scannedAssetIds = new Set(session.scannedAssets.map((s) => s.assetId));

  const missingAssetIds = [...expectedAssetIds].filter((id) => !scannedAssetIds.has(id));
  const unexpectedAssetIds = [...scannedAssetIds].filter((id) => !expectedAssetIds.has(id));

  const missingAssets = missingAssetIds
    .map((id) => {
      const asset = assets.find((a) => a.id === id);
      if (!asset) return null;
      return {
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        assetName: asset.name,
        assetTypeName: asset.assetType?.name || 'Unknown',
        lastLocation: asset.location,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const completionRate =
    expectedAssetIds.size > 0 ? (scannedAssetIds.size / expectedAssetIds.size) * 100 : 0;

  return {
    sessionId: session.id,
    sessionName: `Stock Take ${session.startDate.substring(0, 10)}`,
    startedAt: session.startDate,
    completedAt: session.completedDate,
    expectedCount: expectedAssetIds.size,
    scannedCount: scannedAssetIds.size,
    missingCount: missingAssetIds.length,
    unexpectedCount: unexpectedAssetIds.length,
    completionRate: Math.round(completionRate * 10) / 10,
    missingAssets,
  };
}

// ============================================================================
// Booking History Aggregation
// ============================================================================

export interface BookingHistoryData {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  mostBookedAssets: Array<{
    assetId: string;
    assetNumber: string;
    assetName: string;
    bookingCount: number;
  }>;
  bookingsByMonth: Array<{
    month: string;
    count: number;
  }>;
}

/**
 * Get most booked assets from booking counts
 */
function getMostBookedAssets(
  assetBookingCounts: Map<string, number>,
  assets: Asset[]
): BookingHistoryData['mostBookedAssets'] {
  return Array.from(assetBookingCounts.entries())
    .map(([assetId, count]) => {
      const asset = assets.find((a) => a.id === assetId);
      return asset
        ? {
            assetId: asset.id,
            assetNumber: asset.assetNumber,
            assetName: asset.name,
            bookingCount: count,
          }
        : null;
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 10);
}

/**
 * Group bookings by month
 */
function groupBookingsByMonth(
  bookings: Booking[]
): BookingHistoryData['bookingsByMonth'] {
  const monthCounts = new Map<string, number>();
  for (const booking of bookings) {
    const month = booking.startDate.substring(0, 7); // YYYY-MM
    monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
  }

  return Array.from(monthCounts.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Aggregate booking history data
 */
export function aggregateBookingHistory(
  bookings: Booking[],
  assets: Asset[],
  startDate: Date,
  endDate: Date
): BookingHistoryData {
  const filteredBookings = bookings.filter((b) => {
    const bookingStart = parseISO(b.startDate);
    return bookingStart >= startDate && bookingStart <= endDate;
  });

  const statusCounts = {
    active: 0,
    completed: 0,
    cancelled: 0,
  };

  const assetBookingCounts = new Map<string, number>();

  for (const booking of filteredBookings) {
    // Count by status
    if (booking.status === 'active') statusCounts.active++;
    else if (booking.status === 'completed') statusCounts.completed++;
    else if (booking.status === 'cancelled') statusCounts.cancelled++;

    // Count by asset
    if (booking.asset?.id) {
      const count = assetBookingCounts.get(booking.asset.id) || 0;
      assetBookingCounts.set(booking.asset.id, count + 1);
    }
  }

  return {
    totalBookings: filteredBookings.length,
    activeBookings: statusCounts.active,
    completedBookings: statusCounts.completed,
    cancelledBookings: statusCounts.cancelled,
    mostBookedAssets: getMostBookedAssets(assetBookingCounts, assets),
    bookingsByMonth: groupBookingsByMonth(filteredBookings),
  };
}
