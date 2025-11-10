/**
 * Edge Case Types
 * Type definitions for edge case handling (T241a-T241i)
 */

import type { UUID, ISOTimestamp } from './entities';

/**
 * T241b: Duplicate scan error information
 */
export interface DuplicateScanInfo {
  assetId: UUID;
  assetNumber: string;
  scannedAt: ISOTimestamp;
  scannedBy: string;
}

/**
 * T241c: Parent deletion conflict information
 */
export interface ParentDeletionConflict {
  parentId: UUID;
  childrenWithBookings: {
    assetId: UUID;
    assetNumber: string;
    activeBookingCount: number;
  }[];
}

/**
 * T241d: Kit booking conflict information
 */
export interface KitBookingConflict {
  kitId: UUID;
  conflictingAssets: {
    assetId: UUID;
    assetNumber: string;
    bookingId: UUID;
    bookedBy: string;
    startDate: ISOTimestamp;
    endDate: ISOTimestamp;
  }[];
}

/**
 * T241i: Insufficient kit availability information
 */
export interface InsufficientKitAvailability {
  kitId: UUID;
  kitName: string;
  required: {
    assetTypeId: UUID;
    assetTypeName: string;
    quantity: number;
  }[];
  available: {
    assetTypeId: UUID;
    assetTypeName: string;
    quantity: number;
  }[];
  shortages: {
    assetTypeId: UUID;
    assetTypeName: string;
    required: number;
    available: number;
    short: number;
  }[];
}

/**
 * Enhanced error with edge case details
 */
export class EdgeCaseError extends Error {
  duplicateScan?: DuplicateScanInfo;
  parentDeletionConflict?: ParentDeletionConflict;
  kitBookingConflict?: KitBookingConflict;
  insufficientAvailability?: InsufficientKitAvailability;
  
  constructor(message: string, details?: {
    duplicateScan?: DuplicateScanInfo;
    parentDeletionConflict?: ParentDeletionConflict;
    kitBookingConflict?: KitBookingConflict;
    insufficientAvailability?: InsufficientKitAvailability;
  }) {
    super(message);
    this.name = 'EdgeCaseError';
    if (details) {
      this.duplicateScan = details.duplicateScan;
      this.parentDeletionConflict = details.parentDeletionConflict;
      this.kitBookingConflict = details.kitBookingConflict;
      this.insufficientAvailability = details.insufficientAvailability;
    }
  }
}
